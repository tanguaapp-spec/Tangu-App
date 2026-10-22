import { createClient, createPublicClient } from '@/lib/supabase/server'
import type { ChaveLimite, ChaveRecurso, UsoPlano } from '@/lib/planos/limites'

export type Plano = {
  id: string
  nome: string
  descricao: string | null
  preco_centavos: number
  moeda: string
  ativo: boolean
  ordem: number
  limites: Partial<Record<ChaveLimite, number | null>>
  recursos: Partial<Record<ChaveRecurso, boolean>>
}

export type Assinatura = {
  id: string
  negocio_id: string
  plano_id: string
  status: 'pendente' | 'ativa' | 'em_atraso' | 'cancelada' | 'expirada'
  valor_centavos: number
  periodo_atual_inicio: string | null
  periodo_atual_fim: string | null
  tolerancia_ate: string | null
  cancelada_em: string | null
  criado_em: string
}

export type Pagamento = {
  id: string
  status: 'pendente' | 'em_processo' | 'aprovado' | 'recusado' | 'estornado' | 'cancelado'
  valor_centavos: number
  pago_em: string | null
  criado_em: string
}

/** Planos ativos, em ordem — leitura pública (página de preços). */
export async function listarPlanos(): Promise<Plano[]> {
  const { data, error } = await createPublicClient()
    .from('planos')
    .select('id, nome, descricao, preco_centavos, moeda, ativo, ordem, limites, recursos')
    .eq('ativo', true)
    .order('ordem')
  if (error) {
    console.error('Erro ao listar planos:', error.message)
    return []
  }
  return data as Plano[]
}

export async function buscarUsoPlano(negocioId: string): Promise<UsoPlano | null> {
  const { data, error } = await createClient().rpc('uso_plano', { p_negocio_id: negocioId })
  if (error) {
    console.error('Erro ao buscar uso do plano:', error.message)
    return null
  }
  return data as UsoPlano
}

export async function buscarAssinaturaAtual(negocioId: string): Promise<Assinatura | null> {
  const { data } = await createClient()
    .from('assinaturas')
    .select('id, negocio_id, plano_id, status, valor_centavos, periodo_atual_inicio, periodo_atual_fim, tolerancia_ate, cancelada_em, criado_em')
    .eq('negocio_id', negocioId)
    .neq('status', 'expirada')
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as Assinatura) ?? null
}

export async function listarPagamentos(negocioId: string, limite = 24): Promise<Pagamento[]> {
  const { data } = await createClient()
    .from('pagamentos')
    .select('id, status, valor_centavos, pago_em, criado_em')
    .eq('negocio_id', negocioId)
    .order('criado_em', { ascending: false })
    .limit(limite)
  return (data as Pagamento[]) ?? []
}

export function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
