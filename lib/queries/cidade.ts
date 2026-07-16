import { createClient } from '@/lib/supabase/server'
import type { Vaga, AvisoCidade } from '@/lib/types/database'

export async function buscarVagas(filtros: { area?: string; limite?: number } = {}): Promise<Vaga[]> {
  const supabase = createClient()
  let query = supabase
    .from('vagas')
    .select('*')
    .eq('status', 'aberta')
    .order('criado_em', { ascending: false })

  if (filtros.area) query = query.eq('area', filtros.area)
  if (filtros.limite) query = query.limit(filtros.limite)

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar vagas:', error.message)
    return []
  }
  return data as Vaga[]
}

export async function buscarAvisosCidade(filtros: { tipo?: string; limite?: number } = {}): Promise<AvisoCidade[]> {
  const supabase = createClient()
  let query = supabase
    .from('avisos_cidade')
    .select('*')
    .eq('ativo', true)
    .order('fixado', { ascending: false })
    .order('criado_em', { ascending: false })

  if (filtros.tipo) query = query.eq('tipo', filtros.tipo)
  if (filtros.limite) query = query.limit(filtros.limite)

  const { data, error } = await query
  if (error) {
    console.error('Erro ao buscar avisos:', error.message)
    return []
  }
  return data as AvisoCidade[]
}
