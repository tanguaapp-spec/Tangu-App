import { createServiceClient } from '@/lib/supabase/server'

/**
 * Métricas do painel do proprietário. Usa service role — SÓ chamar depois
 * de verificarAdmin()/requireAdminOrRedirect() (o layout de /painel/admin
 * já garante isso).
 *
 * Definições (também exibidas na tela):
 * - Receita confirmada: soma de pagamentos com status "aprovado" no período.
 * - MRR estimado: soma do valor mensal das assinaturas "ativa" agora.
 *   É projeção, não dinheiro recebido.
 * - Pendente: pagamentos "pendente"/"em_processo" no período.
 * - Conversão: negócios com plano pago valendo ÷ negócios aprovados ativos.
 */
export type PeriodoDias = 7 | 30 | 90

async function contar(consulta: PromiseLike<{ count: number | null }>) {
  const { count } = await consulta
  return count ?? 0
}

export async function metricasCrescimento(dias: PeriodoDias) {
  const db = createServiceClient()
  const desde = new Date(Date.now() - dias * 86400e3).toISOString()

  const [usuarios, novosUsuarios, negociosAtivos, novosNegocios, autonomos, comOferta, comCapaEWhats, ativosPeriodo] =
    await Promise.all([
      contar(db.from('perfis').select('id', { count: 'exact', head: true })),
      contar(db.from('perfis').select('id', { count: 'exact', head: true }).gte('criado_em', desde)),
      contar(db.from('negocios').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('status_cadastro', 'aprovado')),
      contar(db.from('negocios').select('id', { count: 'exact', head: true }).eq('origem', 'cadastro_manual').gte('criado_em', desde)),
      contar(
        db.from('negocios').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('status_cadastro', 'aprovado').eq('tipo_perfil', 'autonomo')
      ),
      db
        .from('cupons')
        .select('negocio_id')
        .eq('ativo', true)
        .gt('expira_em', new Date().toISOString())
        .then(({ data }) => new Set((data ?? []).map((c) => c.negocio_id)).size),
      contar(
        db
          .from('negocios')
          .select('id', { count: 'exact', head: true })
          .eq('ativo', true)
          .eq('status_cadastro', 'aprovado')
          .not('whatsapp', 'is', null)
          .not('foto_capa_url', 'is', null)
          .not('descricao', 'is', null)
      ),
      // "ativo" = fez alguma ação registrada no período (avaliou, favoritou, reagiu)
      Promise.all([
        db.from('avaliacoes').select('autor_id').gte('criado_em', desde),
        db.from('favoritos').select('perfil_id').gte('criado_em', desde),
        db.from('reacoes_aviso').select('perfil_id').gte('criado_em', desde),
      ]).then(([a, f, r]) => {
        const ids = new Set<string>()
        for (const x of a.data ?? []) ids.add(x.autor_id)
        for (const x of f.data ?? []) ids.add(x.perfil_id)
        for (const x of r.data ?? []) ids.add(x.perfil_id)
        return ids.size
      }),
    ])

  return {
    usuarios,
    novosUsuarios,
    negociosAtivos,
    novosNegocios,
    autonomos,
    estabelecimentos: negociosAtivos - autonomos,
    comOferta,
    perfisCompletos: comCapaEWhats,
    usuariosAtivos: ativosPeriodo,
  }
}

export async function metricasReceita(dias: PeriodoDias) {
  const db = createServiceClient()
  const desde = new Date(Date.now() - dias * 86400e3).toISOString()

  const [{ data: assinaturas }, { data: pagamentos }, negociosAtivos] = await Promise.all([
    db.from('assinaturas').select('plano_id, status, valor_centavos, cancelada_em, criado_em'),
    db.from('pagamentos').select('status, valor_centavos, pago_em, criado_em').gte('criado_em', desde),
    contar(db.from('negocios').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('status_cadastro', 'aprovado')),
  ])

  const porPlano: Record<string, Record<string, number>> = {}
  let mrrCentavos = 0
  let emAtraso = 0
  let cancelamentos = 0
  let pagantes = 0
  for (const a of assinaturas ?? []) {
    porPlano[a.plano_id] ??= {}
    porPlano[a.plano_id][a.status] = (porPlano[a.plano_id][a.status] ?? 0) + 1
    if (a.status === 'ativa') {
      mrrCentavos += a.valor_centavos
      pagantes++
    }
    if (a.status === 'em_atraso') {
      emAtraso++
      pagantes++
    }
    if (a.cancelada_em && a.cancelada_em >= desde) cancelamentos++
  }

  let confirmadaCentavos = 0
  let pendenteCentavos = 0
  let recusados = 0
  let estornadoCentavos = 0
  for (const p of pagamentos ?? []) {
    if (p.status === 'aprovado') confirmadaCentavos += p.valor_centavos
    else if (p.status === 'pendente' || p.status === 'em_processo') pendenteCentavos += p.valor_centavos
    else if (p.status === 'recusado') recusados++
    else if (p.status === 'estornado') estornadoCentavos += p.valor_centavos
  }

  return {
    porPlano,
    mrrCentavos,
    confirmadaCentavos,
    pendenteCentavos,
    estornadoCentavos,
    recusados,
    emAtraso,
    cancelamentos,
    pagantes,
    conversao: negociosAtivos > 0 ? pagantes / negociosAtivos : 0,
  }
}

export async function metricasSaude() {
  const db = createServiceClient()
  const ontem = new Date(Date.now() - 86400e3).toISOString()
  const semana = new Date(Date.now() - 7 * 86400e3).toISOString()

  const [errosDia, avisosDia, webhooksFalhos, webhooksInvalidos, { data: ultimoCron }, { data: errosRecentes }] = await Promise.all([
    contar(db.from('error_logs').select('id', { count: 'exact', head: true }).eq('nivel', 'error').gte('criado_em', ontem)),
    contar(db.from('error_logs').select('id', { count: 'exact', head: true }).eq('nivel', 'warning').gte('criado_em', ontem)),
    contar(db.from('eventos_webhook').select('id', { count: 'exact', head: true }).eq('status', 'falhou')),
    contar(db.from('eventos_webhook').select('id', { count: 'exact', head: true }).eq('assinatura_valida', false).gte('recebido_em', semana)),
    db.from('registros_auditoria').select('criado_em, dados').eq('acao', 'cron.assinaturas').order('criado_em', { ascending: false }).limit(1).maybeSingle(),
    db.from('error_logs').select('id, mensagem, contexto, criado_em').eq('nivel', 'error').order('criado_em', { ascending: false }).limit(5),
  ])

  const integracoes = {
    mercadoPago: !!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() && !!process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim(),
    webPush: !!process.env.VAPID_PRIVATE_KEY && !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    cron: !!process.env.CRON_SECRET,
    sentry: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    siteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
  }

  const cronAtrasado = !ultimoCron || Date.now() - new Date(ultimoCron.criado_em).getTime() > 26 * 3600e3

  return { errosDia, avisosDia, webhooksFalhos, webhooksInvalidos, ultimoCron, cronAtrasado, errosRecentes: errosRecentes ?? [], integracoes }
}

export async function metricasModeracao() {
  const db = createServiceClient()
  const [cadastrosPendentes, denunciasPendentes, reivindicacoesPendentes, chamadosAbertos] = await Promise.all([
    contar(db.from('negocios').select('id', { count: 'exact', head: true }).eq('status_cadastro', 'pendente')),
    contar(db.from('denuncias').select('id', { count: 'exact', head: true }).eq('status', 'pendente')),
    contar(db.from('solicitacoes_reivindicacao').select('id', { count: 'exact', head: true }).eq('status', 'pendente')),
    // tabela vem na 0018 — se ainda não existir, count vem null → 0
    contar(db.from('chamados_suporte').select('id', { count: 'exact', head: true }).in('status', ['aberto', 'escalado'])),
  ])
  return { cadastrosPendentes, denunciasPendentes, reivindicacoesPendentes, chamadosAbertos }
}
