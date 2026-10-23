'use server'

import { traduzirErroBanco } from '@/lib/planos/limites'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { creditarPontos, jaCreditouPontos } from '@/lib/gamificacao/pontos'
import { normalizarTelefoneBR } from '@/lib/utils'
import { enviarImagem } from '@/lib/storage/imagens'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'

// Só estas colunas podem ser alteradas por aqui — o objeto vem do navegador.
const schemaPerfil = z.object({
  nome_completo: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  telefone: z.string().trim().max(30).optional(),
  bairro: z.string().trim().max(100).optional(),
})

export async function atualizarPerfil(dados: { nome_completo?: string; telefone?: string; bairro?: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }

  const validado = schemaPerfil.safeParse(dados)
  if (!validado.success) return { erro: validado.error.issues[0].message }

  const telefone = validado.data.telefone ? normalizarTelefoneBR(validado.data.telefone) : null
  if (validado.data.telefone && !telefone) return { erro: 'Telefone inválido. Use DDD + número.' }

  const { error } = await supabase
    .from('perfis')
    .update({ nome_completo: validado.data.nome_completo, telefone, bairro: validado.data.bairro || null })
    .eq('id', user.id)
  if (error) {
    console.error('Erro ao atualizar perfil:', error.message)
    return { erro: traduzirErroBanco(error) }
  }

  if (validado.data.bairro && !(await jaCreditouPontos(user.id, 'perfil_completo'))) {
    await creditarPontos(user.id, 'perfil_completo').catch(() => {})
  }

  revalidatePath('/perfil')
  return { erro: null }
}

/** Onboarding opcional do morador: interesses → personaliza home e avisos. */
export async function salvarInteresses(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }

  const ids = formData
    .getAll('categorias')
    .map(String)
    .filter((id) => z.string().uuid().safeParse(id).success)
    .slice(0, 20)
  const bairro = String(formData.get('bairro') ?? '').trim().slice(0, 100)

  const { error } = await supabase
    .from('perfis')
    .update({ categorias_interesse: ids, onboarding_concluido_em: new Date().toISOString(), ...(bairro ? { bairro } : {}) })
    .eq('id', user.id)
  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/')
  return { erro: null }
}

/** Foto do perfil (aparece nas avaliações e no topo do app). */
export async function atualizarAvatar(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }
  if (!(await dentroDoLimite(`avatar:${user.id}`, 10, 60 * 60))) return { erro: 'Muitas trocas seguidas. Tente daqui a pouco.' }

  const arquivo = formData.get('foto')
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: 'Escolha uma foto.' }
  const { url, erro } = await enviarImagem(supabase, arquivo, `usuarios/${user.id}/avatar`)
  if (erro || !url) return { erro: erro ?? 'Não foi possível enviar a foto.' }

  const { error } = await supabase.from('perfis').update({ avatar_url: url }).eq('id', user.id)
  if (error) return { erro: traduzirErroBanco(error) }
  revalidatePath('/perfil')
  return { erro: null, url }
}
