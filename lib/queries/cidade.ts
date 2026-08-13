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

/** Respostas (negócios indicados) de todas as perguntas de uma vez, agrupadas por aviso_id. */
export async function buscarRespostasPerguntas(avisoIds: string[]) {
  type Resposta = { id: string; negocio: { id: string; nome: string } }
  if (avisoIds.length === 0) return new Map<string, Resposta[]>()
  const supabase = createClient()
  const { data, error } = await supabase
    .from('respostas_pergunta')
    .select('id, aviso_id, negocio:negocios(id, nome)')
    .in('aviso_id', avisoIds)

  if (error) {
    console.error('Erro ao buscar respostas de perguntas:', error.message)
    return new Map<string, Resposta[]>()
  }

  const porAviso = new Map<string, Resposta[]>()
  for (const r of (data ?? []) as unknown as { id: string; aviso_id: string; negocio: { id: string; nome: string } }[]) {
    const lista = porAviso.get(r.aviso_id) ?? []
    lista.push({ id: r.id, negocio: r.negocio })
    porAviso.set(r.aviso_id, lista)
  }
  return porAviso
}

/** Contagem de reações por aviso + qual o usuário atual já deu (se algum). */
export async function buscarReacoes(avisoIds: string[], usuarioId?: string) {
  if (avisoIds.length === 0) return { contagens: new Map<string, Record<string, number>>(), minhas: new Map<string, string>() }
  const supabase = createClient()
  const { data, error } = await supabase.from('reacoes_aviso').select('aviso_id, perfil_id, tipo').in('aviso_id', avisoIds)

  if (error) {
    console.error('Erro ao buscar reações:', error.message)
    return { contagens: new Map(), minhas: new Map() }
  }

  const contagens = new Map<string, Record<string, number>>()
  const minhas = new Map<string, string>()
  for (const r of data ?? []) {
    const atual = contagens.get(r.aviso_id) ?? {}
    atual[r.tipo] = (atual[r.tipo] ?? 0) + 1
    contagens.set(r.aviso_id, atual)
    if (usuarioId && r.perfil_id === usuarioId) minhas.set(r.aviso_id, r.tipo)
  }
  return { contagens, minhas }
}
