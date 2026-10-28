import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { notificar } from '@/lib/notificacoes/notificar'
import { PREFIXO_COMPRA, processarPagamentoCompra } from './compras'
import { clienteMercadoPago, type ClienteMercadoPago, type PreapprovalMP } from './mercadopago'
import {
  aplicarPagamento,
  aplicarPreapproval,
  expirarSeVencida,
  mapearStatusPagamentoMP,
  type AssinaturaLocal,
  type PatchAssinatura,
  type StatusPagamento,
} from './estado-assinatura'

/**
 * Liga as notificações do Mercado Pago ao banco. NUNCA usa o conteúdo da
 * notificação como verdade: sempre busca o recurso na API do MP com o
 * token do servidor e aplica o estado atual (idempotente — reprocessar o
 * mesmo evento dá o mesmo resultado).
 */

type Deps = { mp: ClienteMercadoPago; db: SupabaseClient; agora: () => Date }

function depsPadrao(): Deps {
  return { mp: clienteMercadoPago, db: createServiceClient(), agora: () => new Date() }
}

type LinhaAssinatura = AssinaturaLocal & {
  id: string
  negocio_id: string
  plano_id: string
  provedor_assinatura_id: string | null
  criado_em: string
}

const COLUNAS = 'id, negocio_id, plano_id, status, provedor_assinatura_id, periodo_atual_inicio, periodo_atual_fim, tolerancia_ate, ultimo_evento_em, criado_em'

async function toleranciaDias(db: SupabaseClient) {
  const { data } = await db.from('configuracoes_sistema').select('valor').eq('chave', 'assinatura_tolerancia_dias').maybeSingle()
  const n = Number(data?.valor)
  return Number.isFinite(n) && n >= 0 ? n : 5
}

async function localizarAssinatura(db: SupabaseClient, porProvedor: string | null, porReferencia: string | null) {
  if (porProvedor) {
    const { data } = await db.from('assinaturas').select(COLUNAS).eq('provedor_assinatura_id', porProvedor).maybeSingle()
    if (data) return data as LinhaAssinatura
  }
  if (porReferencia && /^[0-9a-f-]{36}$/i.test(porReferencia)) {
    const { data } = await db.from('assinaturas').select(COLUNAS).eq('id', porReferencia).maybeSingle()
    if (data) return data as LinhaAssinatura
  }
  return null
}

/** Grava a mudança, aplica benefícios do plano e registra auditoria/aviso. */
async function salvarPatch(deps: Deps, assinatura: LinhaAssinatura, patch: PatchAssinatura | null, origem: string) {
  if (!patch || Object.keys(patch).length === 0) return assinatura
  const { error } = await deps.db
    .from('assinaturas')
    .update({ ...patch, atualizado_em: deps.agora().toISOString() })
    .eq('id', assinatura.id)
  if (error) throw new Error(`Falha ao atualizar assinatura: ${error.message}`)

  const nova = { ...assinatura, ...patch } as LinhaAssinatura
  await aplicarBeneficiosPlano(deps, nova)

  if (patch.status && patch.status !== assinatura.status) {
    await deps.db.from('registros_auditoria').insert({
      acao: 'assinatura.status',
      entidade: 'assinatura',
      entidade_id: assinatura.id,
      dados: { de: assinatura.status, para: patch.status, origem, plano: assinatura.plano_id },
    })
    await avisarDono(deps, nova, patch.status)
  }
  return nova
}

/** Validade do benefício pago: até quando o plano vale, olhando o estado atual. */
export function validadeBeneficio(a: AssinaturaLocal, agora: Date): Date {
  switch (a.status) {
    case 'ativa':
      return a.periodo_atual_fim ? new Date(a.periodo_atual_fim) : agora
    case 'em_atraso':
      return a.tolerancia_ate ? new Date(a.tolerancia_ate) : agora
    case 'cancelada':
      return a.periodo_atual_fim ? new Date(a.periodo_atual_fim) : agora
    default:
      return agora
  }
}

async function aplicarBeneficiosPlano(deps: Deps, a: LinhaAssinatura) {
  const { data: plano } = await deps.db.from('planos').select('recursos').eq('id', a.plano_id).maybeSingle()
  if (!plano?.recursos?.destaque_busca) return
  const validade = validadeBeneficio(a, deps.agora())
  await deps.db
    .from('negocios')
    .update({ destaque_ativo: validade > deps.agora(), destaque_expira_em: validade.toISOString() })
    .eq('id', a.negocio_id)
}

const MENSAGENS: Partial<Record<string, { title: string; body: string }>> = {
  ativa: { title: 'Plano ativado ✅', body: 'Pagamento confirmado. Os recursos do seu plano já estão liberados.' },
  em_atraso: { title: 'Pagamento não aprovado', body: 'Não conseguimos cobrar seu plano. Atualize o pagamento pra não perder os recursos.' },
  cancelada: { title: 'Assinatura cancelada', body: 'Seu plano continua valendo até o fim do período já pago.' },
  expirada: { title: 'Plano encerrado', body: 'Seu negócio voltou pro plano Gratuito. Nada foi apagado.' },
}

async function avisarDono(deps: Deps, a: LinhaAssinatura, status: string) {
  const msg = MENSAGENS[status]
  if (!msg) return
  const { data: negocio } = await deps.db.from('negocios').select('reivindicado_por').eq('id', a.negocio_id).maybeSingle()
  if (!negocio?.reivindicado_por) return
  // essencial (cobrança): sem categoria, chega mesmo pra quem desligou avisos opcionais
  await notificar([negocio.reivindicado_por], { tipo: 'assinatura', titulo: msg.title, corpo: msg.body, url: '/painel/negocio/assinatura' })
}

// ---------------------------------------------------------------------

export async function sincronizarPreapproval(preapprovalId: string, deps: Deps = depsPadrao()) {
  const mp = await deps.mp.buscarAssinatura(preapprovalId)
  const local = await localizarAssinatura(deps.db, mp.id, mp.external_reference)
  if (!local) return { resultado: 'ignorado' as const, motivo: 'assinatura local não encontrada' }

  if (!local.provedor_assinatura_id) {
    await deps.db.from('assinaturas').update({ provedor_assinatura_id: mp.id }).eq('id', local.id)
  }

  let atual = await salvarPatch(
    deps,
    local,
    aplicarPreapproval(
      local,
      { status: mp.status, ultimaModificacao: mp.last_modified ?? null, proximaCobranca: mp.next_payment_date ?? null },
      { agora: deps.agora() }
    ),
    'preapproval'
  )

  // Reconciliação: se o MP já registra cobrança feita e a gente ainda está
  // pendente (webhook de pagamento perdido), ativa com base nesse dado do MP.
  if (atual.status === 'pendente' && mp.status === 'authorized' && (mp.summarized?.charged_quantity ?? 0) >= 1) {
    atual = await salvarPatch(
      deps,
      atual,
      aplicarPagamento(
        atual,
        { status: 'aprovado', pagoEm: mp.summarized?.last_charged_date ?? null, atualizadoEm: null },
        { agora: deps.agora(), toleranciaDias: await toleranciaDias(deps.db), proximaCobranca: mp.next_payment_date ?? null }
      ),
      'reconciliacao'
    )
  }
  return { resultado: 'processado' as const, status: atual.status }
}

async function registrarPagamento(
  deps: Deps,
  dados: {
    pagamentoId: string
    status: StatusPagamento
    valor: number | undefined
    pagoEm: string | null
    atualizadoEm: string | null
    detalhe: string | null
    preapprovalId: string | null
    referencia: string | null
  }
) {
  const assinatura = await localizarAssinatura(deps.db, dados.preapprovalId, dados.referencia)
  if (!assinatura) return { resultado: 'ignorado' as const, motivo: 'pagamento sem assinatura conhecida' }

  const { error } = await deps.db.from('pagamentos').upsert(
    {
      provedor: 'mercadopago',
      provedor_pagamento_id: dados.pagamentoId,
      assinatura_id: assinatura.id,
      negocio_id: assinatura.negocio_id,
      status: dados.status,
      valor_centavos: Math.round((dados.valor ?? 0) * 100),
      pago_em: dados.status === 'aprovado' ? dados.pagoEm : null,
      detalhe_status: dados.detalhe?.slice(0, 120) ?? null,
      atualizado_em: deps.agora().toISOString(),
    },
    { onConflict: 'provedor,provedor_pagamento_id' }
  )
  if (error) throw new Error(`Falha ao gravar pagamento: ${error.message}`)

  let proximaCobranca: string | null = null
  if (assinatura.provedor_assinatura_id && dados.status === 'aprovado') {
    const mp: PreapprovalMP = await deps.mp.buscarAssinatura(assinatura.provedor_assinatura_id)
    proximaCobranca = mp.next_payment_date ?? null
  }

  const nova = await salvarPatch(
    deps,
    assinatura,
    aplicarPagamento(
      assinatura,
      { status: dados.status, pagoEm: dados.pagoEm, atualizadoEm: dados.atualizadoEm },
      { agora: deps.agora(), toleranciaDias: await toleranciaDias(deps.db), proximaCobranca }
    ),
    'pagamento'
  )
  return { resultado: 'processado' as const, status: nova.status }
}

export async function processarNotificacao(evento: { tipo: string; recursoId: string }, deps: Deps = depsPadrao()) {
  switch (evento.tipo) {
    case 'subscription_preapproval':
    case 'preapproval':
      return sincronizarPreapproval(evento.recursoId, deps)

    case 'subscription_authorized_payment':
    case 'authorized_payment': {
      const ap = await deps.mp.buscarPagamentoAutorizado(evento.recursoId)
      if (ap.payment?.id) {
        return registrarPagamento(deps, {
          pagamentoId: String(ap.payment.id),
          status: mapearStatusPagamentoMP(ap.payment.status),
          valor: ap.transaction_amount,
          pagoEm: ap.last_modified ?? null,
          atualizadoEm: ap.last_modified ?? null,
          detalhe: ap.payment.status_detail ?? null,
          preapprovalId: ap.preapproval_id,
          referencia: null,
        })
      }
      if (ap.status === 'recycling') {
        return registrarPagamento(deps, {
          pagamentoId: `ap-${ap.id}`,
          status: 'recusado',
          valor: ap.transaction_amount,
          pagoEm: null,
          atualizadoEm: ap.last_modified ?? null,
          detalhe: 'recycling',
          preapprovalId: ap.preapproval_id,
          referencia: null,
        })
      }
      return { resultado: 'ignorado' as const, motivo: `authorized_payment ${ap.status} sem pagamento` }
    }

    case 'payment': {
      const p = await deps.mp.buscarPagamento(evento.recursoId)
      // compra avulsa de divulgação (Checkout Pro), não assinatura
      if (p.external_reference?.startsWith(PREFIXO_COMPRA)) return processarPagamentoCompra(p, deps)
      const preapprovalId = typeof p.metadata?.preapproval_id === 'string' ? p.metadata.preapproval_id : null
      return registrarPagamento(deps, {
        pagamentoId: String(p.id),
        status: mapearStatusPagamentoMP(p.status),
        valor: p.transaction_amount,
        pagoEm: p.date_approved ?? null,
        atualizadoEm: p.date_last_updated ?? null,
        detalhe: p.status_detail ?? null,
        preapprovalId,
        referencia: p.external_reference ?? null,
      })
    }

    default:
      return { resultado: 'ignorado' as const, motivo: `tipo ${evento.tipo} não tratado` }
  }
}

/**
 * Rotina diária (cron): reconcilia com o MP, expira o que venceu, encerra
 * checkouts abandonados e reprocessa webhooks que falharam.
 */
export async function reconciliarAssinaturas(deps: Deps = depsPadrao()) {
  const relatorio = { sincronizadas: 0, expiradas: 0, abandonadas: 0, webhooksReprocessados: 0, erros: [] as string[] }
  const agora = deps.agora()

  const { data: abertas } = await deps.db
    .from('assinaturas')
    .select(COLUNAS)
    .in('status', ['pendente', 'ativa', 'em_atraso', 'cancelada'])
    .limit(500)

  for (const a of (abertas ?? []) as LinhaAssinatura[]) {
    try {
      if (a.provedor_assinatura_id && a.status !== 'cancelada') {
        await sincronizarPreapproval(a.provedor_assinatura_id, deps)
        relatorio.sincronizadas++
      }
      const { data: fresca } = await deps.db.from('assinaturas').select(COLUNAS).eq('id', a.id).single()
      const linha = (fresca ?? a) as LinhaAssinatura

      if (linha.status === 'pendente' && agora.getTime() - new Date(linha.criado_em).getTime() > 7 * 86400e3) {
        if (linha.provedor_assinatura_id) await deps.mp.cancelarAssinatura(linha.provedor_assinatura_id).catch(() => undefined)
        await salvarPatch(deps, linha, { status: 'expirada', cancelada_em: agora.toISOString() }, 'abandono')
        relatorio.abandonadas++
        continue
      }
      const patch = expirarSeVencida(linha, agora)
      if (patch) {
        await salvarPatch(deps, linha, patch, 'cron')
        relatorio.expiradas++
      }
    } catch (err) {
      relatorio.erros.push(`${a.id}: ${(err as Error).message}`)
    }
  }

  // destaque concedido (por plano ou manual) que já venceu sai da vitrine
  await deps.db.from('negocios').update({ destaque_ativo: false }).eq('destaque_ativo', true).lt('destaque_expira_em', agora.toISOString())

  const { data: falhos } = await deps.db
    .from('eventos_webhook')
    .select('id, tipo, recurso_id, tentativas')
    .eq('status', 'falhou')
    .eq('assinatura_valida', true)
    .lt('tentativas', 5)
    .limit(50)
  for (const e of falhos ?? []) {
    try {
      const r = await processarNotificacao({ tipo: e.tipo ?? '', recursoId: e.recurso_id ?? '' }, deps)
      await deps.db
        .from('eventos_webhook')
        .update({ status: r.resultado, tentativas: e.tentativas + 1, erro: null, processado_em: agora.toISOString() })
        .eq('id', e.id)
      relatorio.webhooksReprocessados++
    } catch (err) {
      await deps.db.from('eventos_webhook').update({ tentativas: e.tentativas + 1, erro: (err as Error).message.slice(0, 500) }).eq('id', e.id)
    }
  }

  return relatorio
}
