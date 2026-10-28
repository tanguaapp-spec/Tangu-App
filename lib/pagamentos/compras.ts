import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/server'
import { notificar } from '@/lib/notificacoes/notificar'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { clienteMercadoPago, type ClienteMercadoPago, type PagamentoMP } from './mercadopago'
import { mapearStatusPagamentoMP } from './estado-assinatura'

/**
 * Compras avulsas de divulgação (banner, destaque, post…). Mesmo princípio
 * das assinaturas: o status vem SEMPRE da API do Mercado Pago, nunca do
 * navegador nem do corpo do webhook; reprocessar dá o mesmo resultado.
 */

export const PREFIXO_COMPRA = 'compra:'

export type StatusCompra = 'aguardando_pagamento' | 'pago' | 'no_ar' | 'encerrada' | 'cancelada' | 'recusada' | 'estornada'

export type Compra = {
  id: string
  servico_id: string
  negocio_id: string | null
  perfil_id: string | null
  nome_servico: string
  dias: number
  valor_centavos: number
  status: StatusCompra
  provedor_pagamento_id: string | null
  pago_em: string | null
  inicia_em: string | null
  termina_em: string | null
}

type Deps = { mp: ClienteMercadoPago; db: SupabaseClient; agora: () => Date }
const depsPadrao = (): Deps => ({ mp: clienteMercadoPago, db: createServiceClient(), agora: () => new Date() })

/** Serviços que entram no ar sozinhos assim que o pagamento é aprovado (não dependem de arte). */
export const ATIVACAO_AUTOMATICA = new Set(['destaque_busca'])

/**
 * Próximo estado da compra a partir do status do pagamento no MP.
 * Pura (sem banco) pra ser testada: devolve só o que muda.
 */
export function proximoEstadoCompra(
  compra: Pick<Compra, 'status' | 'dias' | 'servico_id' | 'termina_em'>,
  pagamento: { status: ReturnType<typeof mapearStatusPagamentoMP>; pagoEm: string | null; valorPago: number | undefined; valorEsperado: number },
  agora: Date
): Partial<Compra> | null {
  const finais: StatusCompra[] = ['encerrada', 'cancelada', 'estornada']
  if (finais.includes(compra.status)) return null

  if (pagamento.status === 'estornado') return { status: 'estornada' }
  if (pagamento.status === 'recusado' || pagamento.status === 'cancelado') {
    return compra.status === 'aguardando_pagamento' ? { status: 'recusada' } : null
  }
  if (pagamento.status !== 'aprovado') return null
  if (compra.status !== 'aguardando_pagamento' && compra.status !== 'recusada') return null

  // valor menor que o cobrado = não libera (proteção contra preferência adulterada)
  if (pagamento.valorPago !== undefined && Math.round(pagamento.valorPago * 100) < pagamento.valorEsperado) return null

  const pagoEm = pagamento.pagoEm ?? agora.toISOString()
  if (ATIVACAO_AUTOMATICA.has(compra.servico_id)) {
    const fim = new Date(agora.getTime() + Math.max(1, compra.dias) * 86400e3)
    return { status: 'no_ar', pago_em: pagoEm, inicia_em: agora.toISOString(), termina_em: fim.toISOString() }
  }
  return { status: 'pago', pago_em: pagoEm }
}

async function aplicar(deps: Deps, compra: Compra, pagamento: PagamentoMP) {
  const patch = proximoEstadoCompra(
    compra,
    {
      status: mapearStatusPagamentoMP(pagamento.status),
      pagoEm: pagamento.date_approved ?? null,
      valorPago: pagamento.transaction_amount,
      valorEsperado: compra.valor_centavos,
    },
    deps.agora()
  )
  if (!patch) return { resultado: 'processado' as const, status: compra.status }

  const { error } = await deps.db
    .from('compras_servicos')
    .update({ ...patch, provedor_pagamento_id: String(pagamento.id), atualizado_em: deps.agora().toISOString() })
    .eq('id', compra.id)
  if (error) throw new Error(`Falha ao atualizar compra: ${error.message}`)

  // destaque comprado: liga na vitrine até o fim do período (somando com o que já tinha)
  if (patch.status === 'no_ar' && compra.servico_id === 'destaque_busca' && compra.negocio_id) {
    const { data: n } = await deps.db.from('negocios').select('destaque_expira_em').eq('id', compra.negocio_id).maybeSingle()
    const atual = n?.destaque_expira_em ? new Date(n.destaque_expira_em) : null
    const base = atual && atual > deps.agora() ? atual : deps.agora()
    const fim = new Date(base.getTime() + Math.max(1, compra.dias) * 86400e3)
    await deps.db.from('negocios').update({ destaque_ativo: true, destaque_expira_em: fim.toISOString() }).eq('id', compra.negocio_id)
  }

  // estorno de destaque comprado: sai da vitrine na hora (o plano, se tiver destaque, religa na rotina diária)
  if (patch.status === 'estornada' && compra.servico_id === 'destaque_busca' && compra.negocio_id) {
    await deps.db.from('negocios').update({ destaque_ativo: false, destaque_expira_em: deps.agora().toISOString() }).eq('id', compra.negocio_id)
  }

  await deps.db.from('registros_auditoria').insert({
    acao: 'compra.status',
    entidade: 'compra_servico',
    entidade_id: compra.id,
    dados: { de: compra.status, para: patch.status, servico: compra.servico_id, valor_centavos: compra.valor_centavos },
  })

  if (patch.status === 'pago' || patch.status === 'no_ar') {
    if (compra.perfil_id) {
      await notificar([compra.perfil_id], {
        tipo: 'compra',
        titulo: 'Pagamento aprovado ✅',
        corpo:
          patch.status === 'no_ar'
            ? `${compra.nome_servico} já está no ar.`
            : `Agora é só chamar a gente no WhatsApp pra combinar a arte de ${compra.nome_servico}.`,
        url: `/painel/negocio/divulgacao?compra=${compra.id}`,
      })
    }
    await enviarNotificacaoParaAdmins({
      title: 'Nova venda de divulgação 💰',
      body: `${compra.nome_servico} · R$ ${(compra.valor_centavos / 100).toFixed(2).replace('.', ',')}`,
      url: '/painel/admin/divulgacao',
      tag: 'venda-divulgacao',
    }).catch(() => undefined)
  }
  return { resultado: 'processado' as const, status: patch.status }
}

const COLUNAS = 'id, servico_id, negocio_id, perfil_id, nome_servico, dias, valor_centavos, status, provedor_pagamento_id, pago_em, inicia_em, termina_em'

/** Webhook de pagamento com external_reference "compra:<id>". */
export async function processarPagamentoCompra(pagamento: PagamentoMP, deps: Deps = depsPadrao()) {
  const id = (pagamento.external_reference ?? '').slice(PREFIXO_COMPRA.length)
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { resultado: 'ignorado' as const, motivo: 'referência de compra inválida' }
  const { data } = await deps.db.from('compras_servicos').select(COLUNAS).eq('id', id).maybeSingle()
  if (!data) return { resultado: 'ignorado' as const, motivo: 'compra não encontrada' }
  return aplicar(deps, data as Compra, pagamento)
}

/**
 * Confere no Mercado Pago se a compra foi paga (volta do checkout e rotina
 * diária). Assim nada depende só do webhook chegar.
 */
export async function sincronizarCompra(compraId: string, deps: Deps = depsPadrao()) {
  const { data } = await deps.db.from('compras_servicos').select(COLUNAS).eq('id', compraId).maybeSingle()
  if (!data) return null
  const compra = data as Compra
  if (compra.status !== 'aguardando_pagamento') return compra.status
  const pagamentos = await deps.mp.buscarPagamentosPorReferencia(`${PREFIXO_COMPRA}${compra.id}`)
  // aprovado vence; senão o mais recente
  const escolhido = pagamentos.find((p) => p.status === 'approved') ?? pagamentos[0]
  if (!escolhido) return compra.status
  const r = await aplicar(deps, compra, escolhido)
  return r.status
}

/** Rotina diária: encerra o que venceu, desiste de checkout abandonado e reconcilia pendentes. */
export async function rotinaCompras(deps: Deps = depsPadrao()) {
  const agora = deps.agora()
  const relatorio = { encerradas: 0, abandonadas: 0, reconciliadas: 0 }
  const { data: vencidas } = await deps.db
    .from('compras_servicos')
    .update({ status: 'encerrada', atualizado_em: agora.toISOString() })
    .eq('status', 'no_ar')
    .lt('termina_em', agora.toISOString())
    .select('id')
  relatorio.encerradas = vencidas?.length ?? 0

  const { data: pendentes } = await deps.db
    .from('compras_servicos')
    .select('id, criado_em')
    .eq('status', 'aguardando_pagamento')
    .limit(100)
  for (const p of pendentes ?? []) {
    const status = await sincronizarCompra(p.id, deps).catch(() => null)
    if (status && status !== 'aguardando_pagamento') relatorio.reconciliadas++
    else if (agora.getTime() - new Date(p.criado_em).getTime() > 4 * 86400e3) {
      await deps.db.from('compras_servicos').update({ status: 'cancelada', atualizado_em: agora.toISOString() }).eq('id', p.id)
      relatorio.abandonadas++
    }
  }
  return relatorio
}
