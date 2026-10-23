'use server'

import { traduzirErroBanco } from '@/lib/planos/limites'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarImagem } from '@/lib/storage/imagens'
import { creditarPontos } from '@/lib/gamificacao/pontos'
import { z } from 'zod'
import { registrarEventoPerfil } from '@/lib/metricas/eventos-perfil'
import { mensagemErroCupom } from '@/lib/ofertas/desconto'
import { notificar } from '@/lib/notificacoes/notificar'
import { agendarLembreteAvaliacao } from '@/lib/avaliacoes/lembretes'

const UUID = /^[0-9a-f-]{36}$/i

export async function registrarCliqueWhatsapp(negocioId: string) {
  if (typeof negocioId !== 'string' || !UUID.test(negocioId)) return { erro: null }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: negocio } = await supabase.from('negocios').select('reivindicado_por').eq('id', negocioId).maybeSingle()
  if (!negocio) return { erro: null }
  await registrarEventoPerfil(negocioId, 'clique_whatsapp', { usuarioId: user?.id ?? null, donoId: negocio.reivindicado_por })
  if (user && negocio.reivindicado_por !== user.id) await agendarLembreteAvaliacao(user.id, negocioId, 'whatsapp')
  return { erro: null }
}

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

    if (error) return { erro: traduzirErroBanco(error) }
  } else {
    const { error } = await supabase
      .from('favoritos')
      .insert({ perfil_id: user.id, negocio_id: negocioId })

    if (error) return { erro: traduzirErroBanco(error) }
    await registrarEventoPerfil(negocioId, 'favorito', { usuarioId: user.id })
    creditarPontos(user.id, 'favorito').catch(() => {})
  }

  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

/** Salvar um produto/serviço (aparece em Você → Favoritos). */
export async function alternarFavoritoProduto(produtoId: string) {
  if (typeof produtoId !== 'string' || !UUID.test(produtoId)) return { erro: 'Produto inválido.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta pra salvar.' }
  const { data: existente } = await supabase
    .from('favoritos_produtos')
    .select('produto_id')
    .eq('perfil_id', user.id)
    .eq('produto_id', produtoId)
    .maybeSingle()
  const { error } = existente
    ? await supabase.from('favoritos_produtos').delete().eq('perfil_id', user.id).eq('produto_id', produtoId)
    : await supabase.from('favoritos_produtos').insert({ perfil_id: user.id, produto_id: produtoId })
  if (error) return { erro: 'Não foi possível salvar agora.' }
  revalidatePath('/favoritos')
  return { erro: null, salvo: !existente }
}

const schemaAvaliacao = z.object({
  nota: z.number().int().min(1, 'Escolha uma nota de 1 a 5.').max(5, 'Escolha uma nota de 1 a 5.'),
  comentario: z.string().max(1000, 'Comentário muito longo (máximo 1000 caracteres).').optional(),
})

export async function enviarAvaliacao(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { erro: 'Você precisa entrar para avaliar.' }
  }

  const nota = Number(formData.get('nota'))
  const comentario = (formData.get('comentario') as string) || ''
  const foto = formData.get('foto') as File | null

  const validado = schemaAvaliacao.safeParse({ nota, comentario })
  if (!validado.success) {
    return { erro: validado.error.issues[0].message }
  }

  const podeAvaliar = await dentroDoLimite(`avaliacao:${user.id}`, 20, 60 * 60)
  if (!podeAvaliar) {
    return { erro: 'Muitas avaliações enviadas. Aguarde um pouco e tente de novo.' }
  }

  const { data: avaliacaoExistente } = await supabase
    .from('avaliacoes')
    .select('id')
    .eq('negocio_id', negocioId)
    .eq('autor_id', user.id)
    .maybeSingle()

  const dados: Record<string, unknown> = {
    negocio_id: negocioId,
    autor_id: user.id,
    nota: validado.data.nota,
    comentario: validado.data.comentario || null,
  }

  if (foto && foto.size > 0) {
    const { url, erro } = await enviarImagem(supabase, foto, `usuarios/${user.id}/avaliacoes`)
    if (erro) return { erro }
    if (url) dados.foto_url = url
  }

  const { error } = await supabase.from('avaliacoes').upsert(dados)

  if (error) return { erro: traduzirErroBanco(error) }

  if (!avaliacaoExistente) {
    creditarPontos(user.id, 'avaliacao').catch(() => {})
    // avisa o dono (e a equipe dele) — responder avaliação aumenta a confiança
    const { data: negocio } = await createServiceClient().from('negocios').select('*').eq('id', negocioId).maybeSingle()
    if (negocio?.reivindicado_por && negocio.reivindicado_por !== user.id) {
      await notificar(
        [negocio.reivindicado_por],
        {
          tipo: 'avaliacao_recebida',
          titulo: `Nova avaliação: ${'★'.repeat(validado.data.nota)}`,
          corpo: validado.data.comentario ? validado.data.comentario.slice(0, 140) : `${negocio.nome} recebeu uma nota ${validado.data.nota}. Responda pelo painel.`,
          url: '/painel/negocio/mais#avaliacoes',
        },
        { categoria: 'meu_negocio' }
      )
    }
  }
  // avaliou: não precisa mais lembrar
  await createServiceClient().from('lembretes_avaliacao').delete().eq('perfil_id', user.id).eq('negocio_id', negocioId)

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

  if (error) return { erro: traduzirErroBanco(error) }

  enviarNotificacaoParaAdmins({
    title: 'Nova reivindicação de perfil',
    body: `Alguém pediu pra assumir o perfil de ${negocio.nome}.`,
    url: '/painel/admin/reivindicacoes',
    tag: 'reivindicacao-pendente',
  }).catch((err) => console.error('Falha ao notificar admins:', err))

  return { erro: null }
}

/** Resgate atômico no banco (resgatar_cupom): respeita limite, prazo e devolve o mesmo código se repetir. */
export async function resgatarCupom(cupomId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: mensagemErroCupom('CUPOM:login'), codigo: null }
  if (!(await dentroDoLimite(`resgate:${user.id}`, 30, 60 * 60))) {
    return { erro: 'Muitas tentativas seguidas. Aguarde um pouco.', codigo: null }
  }

  const { data, error } = await supabase.rpc('resgatar_cupom', { p_cupom_id: cupomId })
  if (error) return { erro: mensagemErroCupom(error.message), codigo: null }
  return { erro: null, codigo: data as string }
}
