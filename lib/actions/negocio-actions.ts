'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function alternarFavorito(negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para favoritar.' }

  const { data: existente } = await supabase
    .from('favoritos')
    .select('*')
    .eq('perfil_id', user.id)
    .eq('negocio_id', negocioId)
    .maybeSingle()

  if (existente) {
    await supabase.from('favoritos').delete().eq('perfil_id', user.id).eq('negocio_id', negocioId)
  } else {
    await supabase.from('favoritos').insert({ perfil_id: user.id, negocio_id: negocioId })
  }

  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function enviarAvaliacao(negocioId: string, nota: number, comentario: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para avaliar.' }

  const { error } = await supabase.from('avaliacoes').upsert({
    negocio_id: negocioId,
    autor_id: user.id,
    nota,
    comentario,
  })

  if (error) return { erro: error.message }

  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function solicitarReivindicacao(negocioId: string, mensagem: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para reivindicar este perfil.' }

  const { error } = await supabase.from('solicitacoes_reivindicacao').insert({
    negocio_id: negocioId,
    solicitante_id: user.id,
    mensagem,
  })

  if (error) return { erro: error.message }
  return { erro: null }
}
