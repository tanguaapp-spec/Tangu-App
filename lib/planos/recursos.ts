import { cacheRequisicao as cache } from '@/lib/cache-requisicao'
import { createServiceClient } from '@/lib/supabase/server'
import { temRecurso, type ChaveRecurso } from '@/lib/planos/limites'

/**
 * Recursos do plano que vale HOJE para o negócio (assinatura, teste grátis
 * ou cortesia — a regra fica no banco, em plano_efetivo). Usado no servidor
 * para liberar ou bloquear telas e ações; o navegador nunca decide isso.
 */
export const recursosDoNegocio = cache(async (negocioId: string) => {
  const db = createServiceClient()
  const { data: planoId } = await db.rpc('plano_efetivo', { p_negocio_id: negocioId })
  const { data } = await db.from('planos').select('id, nome, recursos').eq('id', (planoId as string) ?? 'gratuito').maybeSingle()
  return {
    planoId: (data?.id as string) ?? 'gratuito',
    planoNome: (data?.nome as string) ?? 'Gratuito',
    recursos: (data?.recursos ?? {}) as Partial<Record<ChaveRecurso, boolean>>,
  }
})

export async function recursoLiberado(negocioId: string, chave: ChaveRecurso) {
  return temRecurso((await recursosDoNegocio(negocioId)).recursos, chave)
}

/** Primeiro plano à venda (mais barato) que tem o recurso — pro texto "disponível no plano X". */
export const planoQueLibera = cache(async (chave: ChaveRecurso) => {
  const { data } = await createServiceClient().from('planos').select('nome, preco_centavos, recursos').eq('ativo', true).order('preco_centavos')
  return (data ?? []).find((p) => temRecurso(p.recursos, chave))?.nome ?? null
})
