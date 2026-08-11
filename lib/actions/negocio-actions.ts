'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function alternarFavorito(negocioId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa entrar para favoritar.' }
  }

  const { data: existente } = await supabase
    .from('favoritos')
    .select('*')
    .eq('perfil_id', user.id)
    .eq('negocio_id', negocioId)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase
      .from('favoritos')
      .delete()
      .eq('perfil_id', user.id)
      .eq('negocio_id', negocioId)

    if (error) return { erro: error.message }
  } else {
    const { error } = await supabase
      .from('favoritos')
      .insert({ perfil_id: user.id, negocio_id: negocioId })

    if (error) return { erro: error.message }
  }

  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function enviarAvaliacao(
  negocioId: string,
  nota: number,
  comentario: string
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa entrar para avaliar.' }
  }

  if (!Number.isFinite(nota) || nota < 1 || nota > 5) {
    return { erro: 'Nota inválida.' }
  }

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

export async function solicitarReivindicacao(
  negocioId: string,
  mensagem: string
) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa entrar para reivindicar este perfil.' }
  }

  // Evita solicitação duplicada quando o negócio já está reivindicado
  const { data: negocio } = await supabase
    .from('negocios')
    .select('reivindicado_por')
    .eq('id', negocioId)
    .single()

  if (!negocio) {
    return { erro: 'Negócio não encontrado.' }
  }

  if (negocio.reivindicado_por) {
    return { erro: 'Este perfil já foi reivindicado.' }
  }

  // Evita solicitação duplicada (pendente)
  const { data: solicitacaoPendente } = await supabase
    .from('solicitacoes_reivindicacao')
    .select('id')
    .eq('negocio_id', negocioId)
    .eq('solicitante_id', user.id)
    .eq('status', 'pendente')
    .maybeSingle()

  if (solicitacaoPendente) {
    return { erro: 'Você já enviou uma solicitação pendente para este perfil.' }
  }

  const { error } = await supabase
    .from('solicitacoes_reivindicacao')
    .insert({
      negocio_id: negocioId,
      solicitante_id: user.id,
      mensagem,
    })

  if (error) return { erro: error.message }

  return { erro: null }
}

