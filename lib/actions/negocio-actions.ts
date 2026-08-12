'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { z } from 'zod'

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

const schemaAvaliacao = z.object({
  nota: z.number().int().min(1, 'Escolha uma nota de 1 a 5.').max(5, 'Escolha uma nota de 1 a 5.'),
  comentario: z.string().max(1000, 'Comentário muito longo (máximo 1000 caracteres).').optional(),
})

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

  const validado = schemaAvaliacao.safeParse({ nota, comentario })
  if (!validado.success) {
    return { erro: validado.error.issues[0].message }
  }

  const podeAvaliar = await dentroDoLimite(`avaliacao:${user.id}`, 20, 60 * 60)
  if (!podeAvaliar) {
    return { erro: 'Muitas avaliações enviadas. Aguarde um pouco e tente de novo.' }
  }

  const { error } = await supabase.from('avaliacoes').upsert({
    negocio_id: negocioId,
    autor_id: user.id,
    nota: validado.data.nota,
    comentario: validado.data.comentario || null,
  })

  if (error) return { erro: error.message }

  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

const schemaReivindicacao = z.object({
  mensagem: z
    .string()
    .trim()
    .min(1, 'Conte pra gente como podemos confirmar que você é o responsável.')
    .max(1000, 'Mensagem muito longa (máximo 1000 caracteres).'),
})

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

  const validado = schemaReivindicacao.safeParse({ mensagem })
  if (!validado.success) {
    return { erro: validado.error.issues[0].message }
  }

  const podeSolicitar = await dentroDoLimite(`reivindicacao:${user.id}`, 10, 60 * 60)
  if (!podeSolicitar) {
    return { erro: 'Muitas solicitações enviadas. Aguarde um pouco e tente de novo.' }
  }

  // Evita solicitação duplicada quando o negócio já está reivindicado
  const { data: negocio } = await supabase
    .from('negocios')
    .select('nome, reivindicado_por')
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
      mensagem: validado.data.mensagem,
    })

  if (error) return { erro: error.message }

  enviarNotificacaoParaAdmins({
    title: 'Nova reivindicação de perfil',
    body: `Alguém pediu pra assumir o perfil de ${negocio.nome}.`,
    url: '/painel/admin/reivindicacoes',
    tag: 'reivindicacao-pendente',
  }).catch((err) => console.error('Falha ao notificar admins:', err))

  return { erro: null }
}
