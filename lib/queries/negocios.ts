import { cache } from 'react'
import { createClient, createPublicClient, createServiceClient } from '@/lib/supabase/server'
import type { ModalidadeAtendimento, Negocio } from '@/lib/types/database'

import { headers } from 'next/headers'
import { aplicarEspeciais, situacaoHorario, type HorarioEspecial } from '@/lib/horario/funcionamento'
import { ehRobo } from '@/lib/metricas/eventos-perfil'

export type OrdemBusca = 'relevancia' | 'nota' | 'novos'

interface FiltrosBusca {
  termo?: string
  categoriaSlug?: string
  bairro?: string
  modalidade?: ModalidadeAtendimento
  tipo?: 'autonomo' | 'estabelecimento'
  verificado?: boolean
  comOferta?: boolean
  /** calculado pelo horário cadastrado (fuso de Tanguá) */
  abertoAgora?: boolean
  /** ★ mínima (média da comunidade ou, sem ela, do Google) */
  notaMinima?: 3 | 4
  ordem?: OrdemBusca
  /** limite fixo, sem paginação — usado em vitrines pequenas (ex: destaques na home) */
  limite?: number
  /** paginação de verdade — página 1-based */
  pagina?: number
  porPagina?: number
}

const POR_PAGINA_PADRAO = 24
// "aberto agora" é calculado aqui (não no banco): filtra até esse tanto e pagina em memória
const TETO_FILTRO_HORARIO = 300

/** Tira do termo o que tem significado na sintaxe de filtro do PostgREST. */
export function termoSeguro(termo: string) {
  return termo.replace(/[,()*%\\:"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
}

/** Conta quantas vezes cada perfil com Destaque apareceu na busca (painel → Estatísticas). */
function contarImpressoesDestaque(lista: Negocio[]) {
  const ids = lista.filter((n) => n.destaque_ativo).map((n) => n.id)
  if (ids.length === 0) return
  try {
    // robô (Google, prévia de link, testes automatizados) não conta
    if (ehRobo(headers().get('user-agent'))) return
    createServiceClient()
      .rpc('registrar_impressoes', { p_ids: ids })
      .then(({ error }) => error && console.error('Impressões do destaque:', error.message))
  } catch {
    // sem service role (build/preview): não conta
  }
}

export type ResultadoBusca = Negocio & { oferta?: string | null }

/**
 * Troca o horário da semana pelos feriados/horários especiais dos próximos
 * 7 dias (tabela horarios_especiais, 0023). Antes da migration, não faz nada.
 */
export async function comHorariosEspeciais<T extends { id: string; horario_funcionamento?: Record<string, string> | null }>(
  lista: T[]
): Promise<(T & { aviso_horario?: string | null })[]> {
  if (lista.length === 0) return lista
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
  const hoje = new Date()
  const { data, error } = await createPublicClient()
    .from('horarios_especiais')
    .select('negocio_id, data, fechado, abre, fecha, motivo')
    .in('negocio_id', lista.map((n) => n.id).slice(0, 400))
    .gte('data', fmt(hoje))
    .lte('data', fmt(new Date(hoje.getTime() + 6 * 86400e3)))
  if (error || !data?.length) return lista
  const porNegocio = new Map<string, HorarioEspecial[]>()
  for (const e of data) porNegocio.set(e.negocio_id, [...(porNegocio.get(e.negocio_id) ?? []), e as HorarioEspecial])
  return lista.map((n) => {
    const esp = porNegocio.get(n.id)
    if (!esp) return n
    const { horario, aviso } = aplicarEspeciais(n.horario_funcionamento, esp, hoje)
    return { ...n, horario_funcionamento: horario, aviso_horario: aviso }
  })
}

export async function buscarNegocios(
  filtros: FiltrosBusca = {}
): Promise<{ negocios: ResultadoBusca[]; total: number; porPagina: number }> {
  const supabase = createClient()
  const porPagina = filtros.porPagina ?? POR_PAGINA_PADRAO
  const agora = new Date().toISOString()

  let query = supabase
    .from('negocios')
    .select('*, categoria:categorias(*)', { count: 'exact' })
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')

  if (filtros.ordem === 'nota') {
    query = query.order('nota_media', { ascending: false, nullsFirst: false }).order('nota_google', { ascending: false, nullsFirst: false })
  } else if (filtros.ordem === 'novos') {
    query = query.order('criado_em', { ascending: false })
  } else {
    query = query
      .order('destaque_ativo', { ascending: false })
      .order('verificado', { ascending: false })
      .order('nota_google', { ascending: false, nullsFirst: false })
  }

  const termo = filtros.termo ? termoSeguro(filtros.termo) : ''
  if (termo) {
    query = query.or(`nome.ilike.%${termo}%,descricao.ilike.%${termo}%,area_atendimento.ilike.%${termo}%`)
  }

  if (filtros.categoriaSlug) {
    const { data: categoria } = await supabase.from('categorias').select('id').eq('slug', filtros.categoriaSlug).maybeSingle()
    if (!categoria) return { negocios: [], total: 0, porPagina }
    // categoria principal inclui as subcategorias (Beleza → Barbearias, Salões…)
    const { data: filhas } = await supabase.from('categorias').select('id').eq('parent_id', categoria.id)
    query = query.in('categoria_id', [categoria.id, ...(filhas ?? []).map((f) => f.id)])
  }
  if (filtros.bairro) query = query.eq('bairro', filtros.bairro)
  if (filtros.modalidade) query = query.contains('modalidades_atendimento', [filtros.modalidade])
  if (filtros.tipo) query = query.eq('tipo_perfil', filtros.tipo)
  if (filtros.verificado) query = query.eq('verificado', true)
  if (filtros.notaMinima) query = query.or(`nota_media.gte.${filtros.notaMinima},nota_google.gte.${filtros.notaMinima}`)

  // ofertas valendo: também servem pro chip "-25%" de cada linha
  const { data: cupons } = await supabase
    .from('cupons')
    .select('negocio_id, desconto_texto, preco_original_centavos, preco_promocional_centavos, limite_resgates, resgates_count')
    .eq('ativo', true)
    .gt('expira_em', agora)
    .lte('inicia_em', agora)
    .limit(1000)
  const ofertaPorNegocio = new Map<string, string>()
  for (const c of cupons ?? []) {
    if (c.limite_resgates && (c.resgates_count ?? 0) >= c.limite_resgates) continue
    if (ofertaPorNegocio.has(c.negocio_id)) continue
    const pct =
      c.preco_original_centavos && c.preco_promocional_centavos !== null && c.preco_promocional_centavos < c.preco_original_centavos
        ? Math.floor(((c.preco_original_centavos - c.preco_promocional_centavos) / c.preco_original_centavos) * 100)
        : null
    ofertaPorNegocio.set(c.negocio_id, pct ? `-${pct}%` : c.desconto_texto.slice(0, 24))
  }
  if (filtros.comOferta) {
    const ids = Array.from(ofertaPorNegocio.keys())
    if (ids.length === 0) return { negocios: [], total: 0, porPagina }
    query = query.in('id', ids.slice(0, 300))
  }

  const comOferta = (lista: Negocio[]) => {
    contarImpressoesDestaque(lista)
    return lista.map((n) => ({ ...n, oferta: ofertaPorNegocio.get(n.id) ?? null }))
  }
  const pagina = Math.max(1, filtros.pagina ?? 1)

  if (filtros.abertoAgora) {
    const { data, error } = await query.limit(TETO_FILTRO_HORARIO)
    if (error) {
      console.error('Erro ao buscar negócios:', error.message)
      return { negocios: [], total: 0, porPagina }
    }
    const ajustados = await comHorariosEspeciais(data as unknown as Negocio[])
    const abertos = ajustados.filter((n) => situacaoHorario(n.horario_funcionamento, n.aberto_agora).aberto === true)
    const inicio = (pagina - 1) * porPagina
    return { negocios: comOferta(abertos.slice(inicio, inicio + porPagina)), total: abertos.length, porPagina }
  }

  if (filtros.limite) {
    query = query.limit(filtros.limite)
  } else {
    const inicio = (pagina - 1) * porPagina
    query = query.range(inicio, inicio + porPagina - 1)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Erro ao buscar negócios:', error.message)
    return { negocios: [], total: 0, porPagina }
  }
  return { negocios: comOferta(await comHorariosEspeciais(data as unknown as Negocio[])), total: count ?? 0, porPagina }
}

/**
 * Escolhe 1 negócio em destaque por dia, de forma determinística (mesmo
 * resultado pra todo mundo no mesmo dia, sem precisar guardar nada) —
 * gera o hábito de "abrir e ver o que rolou hoje", tipo Wordle.
 */
export async function buscarAchadoDoDia(): Promise<Negocio | null> {
  // cliente público (não toca em cookies) pra não forçar a home a virar dynamic
  const supabase = createPublicClient()

  const { count } = await supabase
    .from('negocios')
    .select('*', { count: 'exact', head: true })
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')

  if (!count || count === 0) return null

  const hoje = new Date().toISOString().slice(0, 10)
  let hash = 0
  for (const char of hoje) hash = (hash * 31 + char.charCodeAt(0)) % 1_000_000
  const indice = hash % count

  const { data, error } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .order('id')
    .range(indice, indice)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar achado do dia:', error.message)
    return null
  }
  return data as unknown as Negocio | null
}

/**
 * Vitrine pequena pra home ("Perto de você") — cliente público (não toca em
 * cookies) pra não forçar a home a virar dynamic, mesmo princípio do achado
 * do dia. Não é distância geográfica de verdade (sem geolocalização ainda),
 * é a mesma ordenação de relevância da busca (destaque > verificado > nota).
 */
export async function buscarNegociosVitrine(limite: number, excluirId?: string | null): Promise<Negocio[]> {
  const supabase = createPublicClient()
  let query = supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .order('destaque_ativo', { ascending: false })
    .order('verificado', { ascending: false })
    .order('nota_google', { ascending: false, nullsFirst: false })
    .limit(excluirId ? limite + 1 : limite)

  if (excluirId) query = query.neq('id', excluirId)

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar vitrine de negócios:', error.message)
    return []
  }
  return (data as unknown as Negocio[]).slice(0, limite)
}

export async function buscarNegocioPorId(id: string): Promise<Negocio | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar negócio:', error.message)
    return null
  }
  return data as unknown as Negocio | null
}

/** Aceita o endereço amigável (slug) ou o id antigo (links já compartilhados). */
/** Com cache por requisição: a página e o generateMetadata compartilham a mesma consulta. */
export const buscarNegocioPorSlugOuId = cache(async function buscarNegocioPorSlugOuId(chave: string): Promise<Negocio | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave)) return buscarNegocioPorId(chave)
  if (!/^[a-z0-9-]{1,80}$/.test(chave)) return null
  const { data, error } = await createClient().from('negocios').select('*, categoria:categorias(*)').eq('slug', chave).maybeSingle()
  if (error) {
    console.error('Erro ao buscar negócio por slug:', error.message)
    return null
  }
  if (!data) return null
  const [ajustado] = await comHorariosEspeciais([data as unknown as Negocio])
  return ajustado
})

export type Categoria = { id: string; nome: string; slug: string; icone: string | null; ordem: number; parent_id?: string | null; ativo?: boolean; mostrar_inicio?: boolean }

/** Categorias ativas, em ordem (principais e subcategorias; use parent_id para montar a árvore). */
export async function buscarCategorias(): Promise<Categoria[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from('categorias').select('*').order('ordem')
  if (error) {
    console.error('Erro ao buscar categorias:', error.message)
    return []
  }
  // antes da 0025 não existe "ativo": todas valem
  return ((data ?? []) as Categoria[]).filter((c) => c.ativo !== false)
}

/** Principais com as subcategorias embaixo — pro <select> agrupado e pros atalhos. */
export function arvoreCategorias(lista: Categoria[]) {
  const principais = lista.filter((c) => !c.parent_id)
  return principais.map((p) => ({ ...p, filhas: lista.filter((c) => c.parent_id === p.id) }))
}

export async function buscarFavoritosUsuario() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('favoritos')
    .select('negocio:negocios(*, categoria:categorias(*))')
    .eq('perfil_id', user.id)
  if (error) {
    console.error('Erro ao buscar favoritos:', error)
    return []
  }
  return data.map(fav => fav.negocio as unknown as Negocio)
}

export async function isFavorito(negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('favoritos')
    .select('*')
    .eq('perfil_id', user.id)
    .eq('negocio_id', negocioId)
    .maybeSingle()
  return !!data
}

export async function buscarCupomAtivo(negocioId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('cupons')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('ativo', true)
    .gt('expira_em', new Date().toISOString())
    .lte('inicia_em', new Date().toISOString())
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

/**
 * Compara esta semana com a anterior por tipo de evento (visualização,
 * favorito, clique no WhatsApp) — alimenta o painel "seu desempenho".
 */
export async function buscarDesempenhoSemanal(negocioId: string) {
  const supabase = createClient()
  const agora = Date.now()
  const seteDias = 7 * 24 * 60 * 60 * 1000
  const inicioSemanaAtual = new Date(agora - seteDias).toISOString()
  const inicioSemanaAnterior = new Date(agora - 2 * seteDias).toISOString()

  const [semanaAtual, semanaAnterior] = await Promise.all([
    supabase.from('eventos_perfil').select('tipo').eq('negocio_id', negocioId).gte('criado_em', inicioSemanaAtual),
    supabase
      .from('eventos_perfil')
      .select('tipo')
      .eq('negocio_id', negocioId)
      .gte('criado_em', inicioSemanaAnterior)
      .lt('criado_em', inicioSemanaAtual),
  ])

  function contar(linhas: { tipo: string }[] | null, tipo: string) {
    return (linhas ?? []).filter((l) => l.tipo === tipo).length
  }

  return {
    visualizacoes: { atual: contar(semanaAtual.data, 'visualizacao'), anterior: contar(semanaAnterior.data, 'visualizacao') },
    favoritos: { atual: contar(semanaAtual.data, 'favorito'), anterior: contar(semanaAnterior.data, 'favorito') },
    cliquesWhatsapp: { atual: contar(semanaAtual.data, 'clique_whatsapp'), anterior: contar(semanaAnterior.data, 'clique_whatsapp') },
  }
}

export async function buscarCartoesFidelidadeDoUsuario(perfilId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('cartoes_fidelidade')
    .select('*, negocio:negocios(id, nome, foto_capa_url)')
    .eq('perfil_id', perfilId)
    .order('atualizado_em', { ascending: false })
  if (error) {
    console.error('Erro ao buscar cartões de fidelidade:', error.message)
    return []
  }
  return data
}

/** Clientes que já favoritaram ou avaliaram o negócio — só esses podem ganhar carimbo. */
export async function buscarClientesConectados(negocioId: string) {
  const supabase = createClient()
  const [{ data: favoritos }, { data: avaliacoes }, { data: cartoes }] = await Promise.all([
    supabase.from('favoritos').select('perfil_id, perfil:perfis(id, nome_completo)').eq('negocio_id', negocioId),
    supabase.from('avaliacoes').select('autor_id, autor:perfis(id, nome_completo)').eq('negocio_id', negocioId),
    supabase.from('cartoes_fidelidade').select('*').eq('negocio_id', negocioId),
  ])

  const porId = new Map<string, { id: string; nome_completo: string }>()
  for (const f of (favoritos ?? []) as any[]) if (f.perfil) porId.set(f.perfil.id, f.perfil)
  for (const a of (avaliacoes ?? []) as any[]) if (a.autor) porId.set(a.autor.id, a.autor)

  const cartaoPorPerfil = new Map((cartoes ?? []).map((c) => [c.perfil_id, c]))

  return Array.from(porId.values()).map((perfil) => ({
    perfil,
    cartao: cartaoPorPerfil.get(perfil.id) ?? null,
  }))
}

export async function buscarCartaoFidelidade(negocioId: string, perfilId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('cartoes_fidelidade')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('perfil_id', perfilId)
    .maybeSingle()
  return data
}

export async function buscarBairros() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('negocios')
    .select('bairro')
    .eq('ativo', true)
    .not('bairro', 'is', null)
  if (error) {
    console.error(error)
    return []
  }
  const uniqueBairros = Array.from(new Set(data.map(n => n.bairro))).sort()
  return uniqueBairros
}
