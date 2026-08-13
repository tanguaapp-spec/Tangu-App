'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  TIPOS_BUSCA,
  MAPA_CATEGORIAS,
  buscarPlacesPorTipo,
  buscarDetalhesPlace,
  extrairBairro,
} from '@/lib/integracao/google-places'

async function requireAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erro: 'Não autenticado.' as const }

  const { data: perfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  if (!perfil || perfil.papel !== 'admin') {
    return { erro: 'Acesso negado (admin).' as const }
  }

  return { user } as const
}

/** Roda `tarefas` em paralelo, no máximo `concorrencia` por vez — sem isso,
 * ~20 categorias x dezenas de lugares sequenciais estouraria o limite de
 * duração de função da Vercel (60s no plano Hobby). */
async function emLotes<T, R>(itens: T[], concorrencia: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = []
  for (let i = 0; i < itens.length; i += concorrencia) {
    const lote = itens.slice(i, i + concorrencia)
    resultados.push(...(await Promise.all(lote.map(tarefa))))
  }
  return resultados
}

/**
 * Sincroniza a lista privada de prospecção com a Google Places API — nunca
 * escreve em `negocios` (tabela pública), só em `prospeccoes_negocios`.
 * Casa automaticamente com um negócio já existente no diretório quando o
 * `google_place_id` bate (ex: o mesmo lugar já foi importado publicamente
 * antes, ou reivindicado por alguém).
 */
export async function sincronizarProspeccoes() {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) {
    return { erro: 'GOOGLE_PLACES_API_KEY não configurada nas Environment Variables da Vercel.' }
  }

  const admin = createServiceClient()
  const { data: negociosExistentes } = await admin.from('negocios').select('id, google_place_id').not('google_place_id', 'is', null)
  const negocioIdPorPlaceId = new Map((negociosExistentes ?? []).map((n) => [n.google_place_id as string, n.id]))

  const erros: string[] = []

  // 1. busca por categoria, em paralelo (poucas dezenas de chamadas)
  const resultadosPorTipo = await emLotes(TIPOS_BUSCA, 6, async (tipo) => {
    try {
      return { tipo, lugares: await buscarPlacesPorTipo(tipo, apiKey) }
    } catch (err: any) {
      erros.push(err.message)
      return { tipo, lugares: [] as any[] }
    }
  })

  // 2. dedupe por place_id, guardando o tipo (categoria) da primeira ocorrência
  const tipoPorPlaceId = new Map<string, string>()
  for (const { tipo, lugares } of resultadosPorTipo) {
    for (const lugar of lugares) {
      if (!tipoPorPlaceId.has(lugar.place_id)) tipoPorPlaceId.set(lugar.place_id, tipo)
    }
  }
  const placeIdsUnicos = Array.from(tipoPorPlaceId.keys())

  // 3. detalhes + upsert em paralelo (concorrência limitada)
  let totalSincronizados = 0
  await emLotes(placeIdsUnicos, 8, async (placeId) => {
    const detalhes = await buscarDetalhesPlace(placeId, apiKey)
    if (!detalhes) return

    const tipo = tipoPorPlaceId.get(placeId)!
    const registro = {
      google_place_id: placeId,
      nome: detalhes.name,
      categoria_slug: MAPA_CATEGORIAS[tipo] ?? null,
      endereco: detalhes.formatted_address ?? null,
      bairro: extrairBairro(detalhes.address_component),
      telefone: detalhes.formatted_phone_number ?? null,
      site: detalhes.website ?? null,
      latitude: detalhes.geometry?.location?.lat ?? null,
      longitude: detalhes.geometry?.location?.lng ?? null,
      nota_google: detalhes.rating ?? null,
      total_avaliacoes_google: detalhes.user_ratings_total ?? null,
      negocio_vinculado_id: negocioIdPorPlaceId.get(placeId) ?? null,
      sincronizado_em: new Date().toISOString(),
    }

    const { error } = await admin.from('prospeccoes_negocios').upsert(registro, { onConflict: 'google_place_id' })
    if (error) erros.push(`${detalhes.name}: ${error.message}`)
    else totalSincronizados++
  })

  revalidatePath('/painel/admin/prospeccao')
  return { erro: null, totalSincronizados, erros }
}

export async function atualizarStatusProspeccao(id: string, status: string, observacoes?: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const admin = createServiceClient()
  const { error } = await admin
    .from('prospeccoes_negocios')
    .update({ status, ...(observacoes !== undefined ? { observacoes } : {}) })
    .eq('id', id)

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/prospeccao')
  return { erro: null }
}
