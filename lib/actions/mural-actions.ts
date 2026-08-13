'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { z } from 'zod'
import type { TipoReacaoAviso } from '@/lib/types/database'

const schemaPergunta = z.object({
  titulo: z.string().trim().min(10, 'Conte um pouco mais — pelo menos 10 caracteres.').max(200, 'Título muito longo.'),
  bairro: z.string().max(100).optional(),
})

const REACOES_VALIDAS = ['gostei', 'parabens', 'obrigado'] as const

// ---------------------------------------------------------------------
// "Pergunte à cidade" — qualquer morador/profissional autenticado pode
// perguntar; a resposta aponta pra um perfil de negócio, não é texto livre.
// ---------------------------------------------------------------------
export async function criarPergunta(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar pra fazer uma pergunta.' }

  const validado = schemaPergunta.safeParse({
    titulo: formData.get('titulo') as string,
    bairro: (formData.get('bairro') as string) || undefined,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  const podePerguntar = await dentroDoLimite(`pergunta:${user.id}`, 5, 60 * 60)
  if (!podePerguntar) return { erro: 'Muitas perguntas enviadas. Aguarde um pouco e tente de novo.' }

  const { error } = await supabase.from('avisos_cidade').insert({
    tipo: 'pergunta',
    titulo: validado.data.titulo,
    conteudo: '',
    bairro: validado.data.bairro || null,
    publicado_por: user.id,
  })
  if (error) return { erro: error.message }

  revalidatePath('/mural')
  return { erro: null }
}

/** Busca rápida pra alimentar o formulário de "indicar um negócio" nas perguntas. */
export async function buscarNegociosParaIndicar(termo: string) {
  if (!termo || termo.trim().length < 2) return []
  const supabase = createClient()
  const { data } = await supabase
    .from('negocios')
    .select('id, nome, categoria:categorias(nome)')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .ilike('nome', `%${termo.trim()}%`)
    .limit(5)
  return (data ?? []) as unknown as { id: string; nome: string; categoria: { nome: string } | null }[]
}

export async function responderPergunta(avisoId: string, negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar pra indicar um negócio.' }

  const podeResponder = await dentroDoLimite(`responder-pergunta:${user.id}`, 20, 60 * 60)
  if (!podeResponder) return { erro: 'Muitas indicações enviadas. Aguarde um pouco e tente de novo.' }

  const { error } = await supabase.from('respostas_pergunta').insert({
    aviso_id: avisoId,
    negocio_id: negocioId,
    autor_id: user.id,
  })
  if (error) {
    if (error.code === '23505') return { erro: 'Você já indicou esse negócio nessa pergunta.' }
    return { erro: error.message }
  }

  revalidatePath('/mural')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Reações no mural (sem comentário livre, de propósito)
// ---------------------------------------------------------------------
export async function alternarReacao(avisoId: string, tipo: TipoReacaoAviso) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar pra reagir.' }

  if (!REACOES_VALIDAS.includes(tipo)) return { erro: 'Reação inválida.' }

  const { data: existente } = await supabase
    .from('reacoes_aviso')
    .select('tipo')
    .eq('aviso_id', avisoId)
    .eq('perfil_id', user.id)
    .maybeSingle()

  if (existente?.tipo === tipo) {
    // clicar de novo na mesma reação remove
    const { error } = await supabase
      .from('reacoes_aviso')
      .delete()
      .eq('aviso_id', avisoId)
      .eq('perfil_id', user.id)
    if (error) return { erro: error.message }
  } else if (existente) {
    // troca de reação
    const { error } = await supabase
      .from('reacoes_aviso')
      .update({ tipo })
      .eq('aviso_id', avisoId)
      .eq('perfil_id', user.id)
    if (error) return { erro: error.message }
  } else {
    const { error } = await supabase
      .from('reacoes_aviso')
      .insert({ aviso_id: avisoId, perfil_id: user.id, tipo })
    if (error) return { erro: error.message }
  }

  revalidatePath('/mural')
  return { erro: null }
}
