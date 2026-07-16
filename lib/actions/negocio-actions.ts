'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function alternarFavorito(negocioId: string) {
  console.log('[LOG] alternarFavorito called for negocio:', negocioId);
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[WARNING] User not authenticated in alternarFavorito');
    return { erro: 'Você precisa entrar para favoritar.' }
  }

  console.log('[LOG] User:', user.id);

  const { data: existente, error: fetchError } = await supabase
    .from('favoritos')
    .select('*')
    .eq('perfil_id', user.id)
    .eq('negocio_id', negocioId)
    .maybeSingle()
  console.log('[LOG] Existing favorite:', existente ? 'found' : 'not found', fetchError);
  if (fetchError) console.error('[ERROR] Fetch favorites fetching:', fetchError);

  let mutationError = null;
  if (existente) {
    console.log('[LOG] Removing favorite');
    const { error } = await supabase.from('favoritos').delete().eq('perfil_id', user.id).eq('negocio_id', negocioId)
    mutationError = error;
  } else {
    console.log('[LOG] Adding favorite');
    const { error } = await supabase.from('favoritos').insert({ perfil_id: user.id, negocio_id: negocioId })
    mutationError = error;
  }
  if (mutationError) {
    console.error('[ERROR] Mutation failed:', mutationError);
  }

  revalidatePath(`/negocio/${negocioId}`)
  console.log('[LOG] alternarFavorito complete');
  return { erro: null }
}

export async function enviarAvaliacao(negocioId: string, nota: number, comentario: string) {
  console.log('[LOG] enviarAvaliacao called:', { negocioId, nota, comentario });
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[WARNING] User not authenticated');
    return { erro: 'Você precisa entrar para avaliar.' }
  }

  const { error } = await supabase.from('avaliacoes').upsert({
    negocio_id: negocioId,
    autor_id: user.id,
    nota,
    comentario,
  })

  if (error) {
    console.error('[ERROR] enviarAvaliacao failed:', error);
    return { erro: error.message }
  }

  revalidatePath(`/negocio/${negocioId}`)
  console.log('[LOG] enviarAvaliacao complete');
  return { erro: null }
}

export async function solicitarReivindicacao(negocioId: string, mensagem: string) {
  console.log('[LOG] solicitarReivindicacao called for negocio:', negocioId);
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[WARNING] User not authenticated');
    return { erro: 'Você precisa entrar para reivindicar este perfil.' }
  }

  const { error } = await supabase.from('solicitacoes_reivindicacao').insert({
    negocio_id: negocioId,
    solicitante_id: user.id,
    mensagem,
  })

  if (error) {
    console.error('[ERROR] solicitarReivindicacao failed:', error);
    return { erro: error.message }
  }

  console.log('[LOG] solicitarReivindicacao complete');
  return { erro: null }
}
