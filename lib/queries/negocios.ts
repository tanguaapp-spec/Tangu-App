import { createClient } from '@/lib/supabase/server'
import type { Negocio } from '@/lib/types/database'

interface FiltrosBusca {
  termo?: string
  categoriaSlug?: string
  bairro?: string
  limite?: number
}

export async function buscarNegocios(filtros: FiltrosBusca = {}): Promise<Negocio[]> {
  const supabase = createClient()
  let query = supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
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

  if (filtros.limite) {
    query = query.limit(filtros.limite)
  }

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar negócios:', error.message)
    return []
  }
  return data as unknown as Negocio[]
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
