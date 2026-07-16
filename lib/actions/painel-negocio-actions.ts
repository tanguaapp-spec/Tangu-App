'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function atualizarNegocio(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const atualizacoes = {
    descricao: formData.get('descricao') as string,
    whatsapp: formData.get('whatsapp') as string,
    instagram: formData.get('instagram') as string,
    site: formData.get('site') as string,
    endereco: formData.get('endereco') as string,
  }

  const { error } = await supabase
    .from('negocios')
    .update(atualizacoes)
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function criarPost(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase.from('posts_negocio').insert({
    negocio_id: negocioId,
    autor_id: user.id,
    tipo: formData.get('tipo') as string,
    titulo: formData.get('titulo') as string,
    conteudo: formData.get('conteudo') as string,
  })

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}
