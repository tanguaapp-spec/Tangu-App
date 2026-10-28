import { createServiceClient } from '@/lib/supabase/server'
import type { DadosBrutos } from './metricas'

const DIA = 86400e3

/** PostgREST devolve até 1000 linhas por vez: pagina até o teto. */
async function todas<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>, teto = 60000): Promise<T[]> {
  const linhas: T[] = []
  for (let de = 0; de < teto; de += 1000) {
    const { data, error } = await consulta(de, de + 999)
    if (error || !data) break
    linhas.push(...data)
    if (data.length < 1000) break
  }
  return linhas
}

/** Junta tudo o que o painel de crescimento precisa (só no servidor, com service role). */
export async function buscarDadosCrescimento(agora = new Date()): Promise<DadosBrutos & { comentariosNps: { nota: number; comentario: string; criado_em: string; publico: string }[] }> {
  const db = createServiceClient()
  const desde = (dias: number) => new Date(agora.getTime() - dias * DIA).toISOString()
  const diaDesde = (dias: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(agora.getTime() - dias * DIA))

  const [atividade, cadastros, negocios, assinaturas, pagas, criadas, investimentos, testes, nps, chamados, ativos] = await Promise.all([
    todas<{ dia: string; visitante: string; perfil_id: string | null }>((de, ate) =>
      db.from('atividade_diaria').select('dia, visitante, perfil_id').gte('dia', diaDesde(70)).order('dia').range(de, ate)
    ),
    todas<{ criado_em: string }>((de, ate) => db.from('perfis').select('criado_em').gte('criado_em', desde(90)).range(de, ate)),
    db.from('negocios').select('id, criado_em, foto_capa_url, whatsapp').eq('origem', 'cadastro_manual').gte('criado_em', desde(30)),
    db.from('assinaturas').select('negocio_id, status, valor_centavos, criado_em, cancelada_em, atualizado_em, periodo_atual_inicio').limit(5000),
    db.from('compras_servicos').select('valor_centavos').in('status', ['pago', 'no_ar', 'encerrada']).gte('pago_em', desde(30)),
    db.from('compras_servicos').select('status').gte('criado_em', desde(30)),
    db.from('investimentos_marketing').select('valor_centavos').gte('mes', desde(30).slice(0, 10)),
    db.from('cortesias_plano').select('negocio_id').eq('motivo', 'teste_gratis').lt('fim', agora.toISOString()).gte('fim', desde(60)),
    db.from('respostas_nps').select('nota, comentario, criado_em, publico').gte('criado_em', desde(90)).order('criado_em', { ascending: false }).limit(2000),
    db.from('chamados_suporte').select('status, avaliacao').gte('criado_em', desde(30)),
    db.from('negocios').select('id', { count: 'exact', head: true }).eq('ativo', true).eq('status_cadastro', 'aprovado'),
  ])

  // primeiro produto ou oferta de cada negócio novo (pra ativação e tempo até o 1º valor)
  const ids = (negocios.data ?? []).map((n) => n.id as string)
  const primeiros = new Map<string, string>()
  if (ids.length) {
    const [{ data: prods }, { data: cupons }] = await Promise.all([
      db.from('produtos_servicos').select('negocio_id, criado_em').in('negocio_id', ids).order('criado_em'),
      db.from('cupons').select('negocio_id, criado_em').in('negocio_id', ids).order('criado_em'),
    ])
    for (const p of [...(prods ?? []), ...(cupons ?? [])]) {
      const atual = primeiros.get(p.negocio_id)
      if (!atual || p.criado_em < atual) primeiros.set(p.negocio_id, p.criado_em)
    }
  }

  return {
    agora,
    atividade,
    cadastros,
    negociosNovos: (negocios.data ?? []).map((n) => ({
      id: n.id,
      criado_em: n.criado_em,
      tem_foto: !!n.foto_capa_url,
      tem_whatsapp: !!n.whatsapp,
      primeiro_item_em: primeiros.get(n.id) ?? null,
    })),
    assinaturas: (assinaturas.data ?? []).map((a) => ({
      negocio_id: a.negocio_id,
      status: a.status,
      valor_centavos: a.valor_centavos,
      criado_em: a.criado_em,
      cancelada_em: a.cancelada_em,
      atualizado_em: a.atualizado_em,
      ja_foi_ativa: !!a.periodo_atual_inicio,
    })),
    comprasPagas30d: pagas.data ?? [],
    comprasCriadas30d: criadas.data ?? [],
    investimento30dCentavos: (investimentos.data ?? []).reduce((s, i) => s + i.valor_centavos, 0),
    testesEncerrados: testes.data ?? [],
    nps: (nps.data ?? []).map((r) => ({ nota: r.nota, criado_em: r.criado_em })),
    comentariosNps: (nps.data ?? []).filter((r) => r.comentario).slice(0, 20) as { nota: number; comentario: string; criado_em: string; publico: string }[],
    chamados30d: chamados.data ?? [],
    negociosAtivosTotal: ativos.count ?? 0,
  }
}
