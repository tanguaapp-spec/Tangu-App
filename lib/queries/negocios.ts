import { createClient, createPublicClient } from '@/lib/supabase/server'
import type { ModalidadeAtendimento, Negocio } from '@/lib/types/database'

interface FiltrosBusca {
  termo?: string
  categoriaSlug?: string
  bairro?: string
  modalidade?: ModalidadeAtendimento
  /** limite fixo, sem paginação — usado em vitrines pequenas (ex: destaques na home) */
  limite?: number
  /** paginação de verdade — página 1-based */
  pagina?: number
  porPagina?: number
}

const POR_PAGINA_PADRAO = 24

export async function buscarNegocios(
  filtros: FiltrosBusca = {}
): Promise<{ negocios: Negocio[]; total: number; porPagina: number }> {
  const supabase = createClient()
  const porPagina = filtros.porPagina ?? POR_PAGINA_PADRAO

  let query = supabase
    .from('negocios')
    .select('*, categoria:categorias(*)', { count: 'exact' })
    .eq('ativo', true)
    .order('destaque_ativo', { ascending: false })
    .order('verificado', { ascending: false })
    .order('nota_google', { ascending: false, nullsFirst: false })

  if (filtros.termo) {
    // Use pg_trgm for better search
    query = query.or(`nome.ilike.%${filtros.termo}%,descricao.ilike.%${filtros.termo}%`)
  }

  if (filtros.categoriaSlug) {
    const { data: categoria } = await supabase
      .from('categorias')
      .select('id')
      .eq('slug', filtros.categoriaSlug)
      .single()
    if (categoria) query = query.eq('categoria_id', categoria.id)
  }

  if (filtros.bairro) {
    query = query.eq('bairro', filtros.bairro)
  }

  if (filtros.modalidade) {
    query = query.contains('modalidades_atendimento', [filtros.modalidade])
  }

  if (filtros.limite) {
    query = query.limit(filtros.limite)
  } else {
    const pagina = Math.max(1, filtros.pagina ?? 1)
    const inicio = (pagina - 1) * porPagina
    query = query.range(inicio, inicio + porPagina - 1)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('Erro ao buscar negócios:', error.message)
    return { negocios: [], total: 0, porPagina }
  }
  return { negocios: data as unknown as Negocio[], total: count ?? 0, porPagina }
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

export async function buscarNegocioPorId(id: string): Promise<Negocio | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Erro ao buscar negócio:', error.message)
    return null
  }
  return data as unknown as Negocio
}

export async function buscarCategorias() {
  const supabase = createClient()
  const { data, error } = await supabase.from('categorias').select('*').order('ordem')
  if (error) {
    console.error('Erro ao buscar categorias:', error.message)
    return []
  }
  return data
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
