import { createServiceClient } from '@/lib/supabase/server'
import { sugestao, temperatura, linkWhatsapp, pontuacao, type Segmento, type Temperatura, type Etapa } from './segmentos'

const DIA = 86400e3

export type LinhaLead = {
  negocioId: string
  nome: string
  slug: string | null
  telefone: string | null
  bairro: string | null
  sinais: { visitas30d: number; cliquesWhats30d: number; favoritos30d: number }
  temperatura: Temperatura
  pontuacao: number
  parecer: string
  linkWhats: string | null
  lead: { id: string; etapa: Etapa; proximo_contato_em: string | null; ultimaNota: string | null } | null
}

type Negocio = {
  id: string
  nome: string
  slug: string | null
  whatsapp: string | null
  telefone: string | null
  bairro: string | null
  foto_capa_url: string | null
  criado_em: string
  reivindicado_por: string | null
}

const COLS = 'id, nome, slug, whatsapp, telefone, bairro, foto_capa_url, criado_em, reivindicado_por'

/** Lista de um segmento, já com sinais de uso, temperatura, parecer e mensagem pronta. */
export async function buscarLeads(segmento: Segmento, agora = new Date()): Promise<LinhaLead[]> {
  const db = createServiceClient()
  const ha = (dias: number) => new Date(agora.getTime() - dias * DIA).toISOString()
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)

  let negocios: Negocio[] = []
  const extra = new Map<string, { diasParaFimTeste?: number; faltando?: string[] }>()

  // negócios que pagam ou estão em cortesia agora (pra separar "gratuito")
  const [{ data: abertas }, { data: cortesias }] = await Promise.all([
    db.from('assinaturas').select('negocio_id').in('status', ['ativa', 'em_atraso']),
    db.from('cortesias_plano').select('negocio_id, motivo, fim').gt('fim', agora.toISOString()),
  ])
  const pagantes = new Set([...(abertas ?? []).map((a) => a.negocio_id as string), ...(cortesias ?? []).map((c) => c.negocio_id as string)])

  if (segmento === 'hoje') {
    const { data } = await db
      .from('leads')
      .select(`negocio:negocios(${COLS})`)
      .lte('proximo_contato_em', hoje)
      .not('etapa', 'in', '(cliente,perdido)')
      .not('negocio_id', 'is', null)
      .limit(200)
    negocios = (data ?? []).map((l) => l.negocio as unknown as Negocio).filter(Boolean)
  } else if (segmento === 'nao_reivindicado') {
    const { data } = await db.from('negocios').select(COLS).is('reivindicado_por', null).eq('ativo', true).limit(600)
    negocios = (data ?? []) as Negocio[]
  } else if (segmento === 'quente') {
    const { data } = await db.from('negocios').select(COLS).not('reivindicado_por', 'is', null).eq('ativo', true).eq('status_cadastro', 'aprovado').limit(1000)
    negocios = ((data ?? []) as Negocio[]).filter((n) => !pagantes.has(n.id))
  } else if (segmento === 'teste') {
    const testes = (cortesias ?? []).filter((c) => c.motivo === 'teste_gratis' && new Date(c.fim).getTime() < agora.getTime() + 7 * DIA)
    const semAssinatura = testes.filter((t) => !(abertas ?? []).some((a) => a.negocio_id === t.negocio_id))
    for (const t of semAssinatura) extra.set(t.negocio_id, { diasParaFimTeste: Math.max(0, Math.ceil((new Date(t.fim).getTime() - agora.getTime()) / DIA)) })
    if (semAssinatura.length) {
      const { data } = await db.from('negocios').select(COLS).in('id', semAssinatura.map((t) => t.negocio_id))
      negocios = (data ?? []) as Negocio[]
    }
  } else if (segmento === 'abandono') {
    const [{ data: assin }, { data: compras }] = await Promise.all([
      db.from('assinaturas').select('negocio_id').eq('status', 'expirada').is('periodo_atual_inicio', null).gte('criado_em', ha(30)),
      db.from('compras_servicos').select('negocio_id').in('status', ['cancelada', 'aguardando_pagamento', 'recusada']).gte('criado_em', ha(30)),
    ])
    const ids = Array.from(new Set([...(assin ?? []), ...(compras ?? [])].map((x) => x.negocio_id as string).filter(Boolean))).filter((id) => !pagantes.has(id))
    if (ids.length) {
      const { data } = await db.from('negocios').select(COLS).in('id', ids)
      negocios = (data ?? []) as Negocio[]
    }
  } else if (segmento === 'cancelou') {
    const { data: canc } = await db
      .from('assinaturas')
      .select('negocio_id')
      .in('status', ['cancelada', 'expirada'])
      .not('periodo_atual_inicio', 'is', null)
      .gte('atualizado_em', ha(60))
    const ids = Array.from(new Set((canc ?? []).map((c) => c.negocio_id as string))).filter((id) => !pagantes.has(id))
    if (ids.length) {
      const { data } = await db.from('negocios').select(COLS).in('id', ids)
      negocios = (data ?? []) as Negocio[]
    }
  } else if (segmento === 'incompleto') {
    const { data } = await db.from('negocios').select(COLS).eq('origem', 'cadastro_manual').gte('criado_em', ha(60)).eq('ativo', true).limit(500)
    const lista = (data ?? []) as Negocio[]
    const ids = lista.map((n) => n.id)
    const comItem = new Set<string>()
    if (ids.length) {
      const [{ data: p }, { data: c }] = await Promise.all([
        db.from('produtos_servicos').select('negocio_id').in('negocio_id', ids),
        db.from('cupons').select('negocio_id').in('negocio_id', ids),
      ])
      for (const x of [...(p ?? []), ...(c ?? [])]) comItem.add(x.negocio_id as string)
    }
    for (const n of lista) {
      const faltando = [!n.foto_capa_url && 'a foto', !n.whatsapp && 'o WhatsApp', !comItem.has(n.id) && 'os primeiros produtos'].filter(Boolean) as string[]
      if (faltando.length) extra.set(n.id, { faltando })
    }
    negocios = lista.filter((n) => extra.has(n.id))
  }

  if (negocios.length === 0) return []
  const ids = negocios.map((n) => n.id)

  // sinais de uso dos últimos 30 dias, em lotes (o filtro "in" tem limite de tamanho de URL)
  const contagem = new Map<string, { visitas30d: number; cliquesWhats30d: number; favoritos30d: number }>()
  for (let i = 0; i < ids.length; i += 150) {
    const lote = ids.slice(i, i + 150)
    const { data } = await db.from('eventos_perfil').select('negocio_id, tipo').in('negocio_id', lote).gte('criado_em', ha(30)).limit(20000)
    for (const e of data ?? []) {
      const c = contagem.get(e.negocio_id) ?? { visitas30d: 0, cliquesWhats30d: 0, favoritos30d: 0 }
      if (e.tipo === 'visualizacao') c.visitas30d++
      else if (e.tipo === 'clique_whatsapp') c.cliquesWhats30d++
      else if (e.tipo === 'favorito') c.favoritos30d++
      contagem.set(e.negocio_id, c)
    }
  }

  const { data: leads } = await db.from('leads').select('id, negocio_id, etapa, proximo_contato_em').in('negocio_id', ids.slice(0, 600))
  const porNegocio = new Map((leads ?? []).map((l) => [l.negocio_id as string, l]))
  const leadIds = (leads ?? []).map((l) => l.id as string)
  const notas = new Map<string, string>()
  if (leadIds.length) {
    const { data: ints } = await db.from('interacoes_lead').select('lead_id, texto, criado_em').in('lead_id', leadIds).order('criado_em', { ascending: false }).limit(1000)
    for (const it of ints ?? []) if (!notas.has(it.lead_id)) notas.set(it.lead_id, it.texto)
  }

  const linhas = negocios.map((n): LinhaLead => {
    const s = contagem.get(n.id) ?? { visitas30d: 0, cliquesWhats30d: 0, favoritos30d: 0 }
    const sinais = { nome: n.nome, ...s, ...extra.get(n.id) }
    const sug = sugestao(segmento, sinais)
    const lead = porNegocio.get(n.id)
    return {
      negocioId: n.id,
      nome: n.nome,
      slug: n.slug,
      telefone: n.whatsapp || n.telefone,
      bairro: n.bairro,
      sinais: s,
      temperatura: temperatura(segmento, sinais),
      pontuacao: pontuacao(s),
      parecer: sug.parecer,
      linkWhats: linkWhatsapp(n.whatsapp || n.telefone, sug.mensagem),
      lead: lead ? { id: lead.id, etapa: lead.etapa as Etapa, proximo_contato_em: lead.proximo_contato_em, ultimaNota: notas.get(lead.id) ?? null } : null,
    }
  })

  // quente só entra com algum movimento; quem já virou cliente ou foi perdido sai das listas automáticas
  return linhas
    .filter((l) => (segmento === 'quente' ? l.pontuacao >= 5 : true))
    .filter((l) => segmento === 'hoje' || !l.lead || !['cliente', 'perdido'].includes(l.lead.etapa))
    .sort((a, b) => b.pontuacao - a.pontuacao)
    .slice(0, 150)
}

/** Quantos em cada lista (pros contadores das abas). */
export async function contarLeadsHoje(agora = new Date()) {
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(agora)
  const { count } = await createServiceClient()
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .lte('proximo_contato_em', hoje)
    .not('etapa', 'in', '(cliente,perdido)')
  return count ?? 0
}
