import { createClient } from '@/lib/supabase/server'
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
