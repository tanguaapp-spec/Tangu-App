'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'
import { creditarPontos } from '@/lib/gamificacao/pontos'
import { traduzirErroAuth } from '@/lib/auth/mensagens'
import { caminhoInternoSeguro, urlDoSite } from '@/lib/site'

const schemaSenha = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'Senha longa demais (máximo 72 caracteres).')

const schemaEmail = z.string().trim().toLowerCase().email('Confira o e-mail digitado.').max(200)

export async function entrarComEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')
  const destino = caminhoInternoSeguro(String(formData.get('next') ?? ''), '/')

  const podeTentar = await dentroDoLimite(`login:${ipDoRequest()}`, 10, 15 * 60)
  if (!podeTentar) {
    return { erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    // sem console.error para evitar logs sensíveis
    if (/email not confirmed/i.test(error.message)) return { erro: traduzirErroAuth(error.message) }
    return { erro: 'E-mail ou senha incorretos.' }
  }

  redirect(destino)
}

const schemaCadastro = z.object({
  email: schemaEmail,
  senha: schemaSenha,
  nomeCompleto: z.string().trim().min(2, 'Informe seu nome.').max(120, 'Nome muito longo.'),
  papel: z.enum(['morador', 'profissional']).catch('morador'),
  codigoConvite: z.string().trim().max(20).optional(),
})

export async function cadastrarComEmail(formData: FormData) {
  if (formData.get('aceiteTermos') !== 'on') {
    return { erro: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.' }
  }

  const validado = schemaCadastro.safeParse({
    email: formData.get('email'),
    senha: formData.get('senha'),
    nomeCompleto: formData.get('nomeCompleto'),
    papel: formData.get('papel') || 'morador',
    codigoConvite: (formData.get('codigo_convite') as string) || undefined,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const { email, senha, nomeCompleto, papel, codigoConvite } = validado.data
  // o banco também limpa (0020): só letras, números e _:.-
  const origem = String(formData.get('origem') ?? '').replace(/[^a-zA-Z0-9_:.-]/g, '').slice(0, 60) || undefined

  const podeCadastrar = await dentroDoLimite(`cadastro:${ipDoRequest()}`, 5, 60 * 60)
  if (!podeCadastrar) {
    return { erro: 'Muitos cadastros a partir deste dispositivo. Aguarde um pouco e tente de novo.' }
  }

  const supabase = createClient()
  const destinoPosConfirmacao = papel === 'profissional' ? '/painel/negocio' : '/bem-vindo'
  const { data: cadastro, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      // o banco ignora qualquer papel que não seja morador/profissional (migration 0016)
      data: { nome_completo: nomeCompleto, papel, codigo_convite: codigoConvite, origem },
      emailRedirectTo: `${urlDoSite()}/auth/callback?next=${encodeURIComponent(destinoPosConfirmacao)}`,
    },
  })

  if (error) {
    return { erro: traduzirErroAuth(error.message) }
  }

  // A linha em perfis já existe nesse ponto (trigger roda na mesma transação
  // do signUp), mesmo antes da confirmação do e-mail — dá pra creditar já.
  // Espera terminar antes do redirect: em serverless a função pode ser
  // congelada logo depois da resposta, então um "fire-and-forget" aqui
  // corre o risco de nunca completar.
  if (cadastro.user) {
    await creditarPontos(cadastro.user.id, 'boas_vindas', 'unico').catch(() => {})
    // a indicação (+20 pra quem convidou) é creditada pelo banco quando este
    // e-mail for confirmado (migration 0029): conta falsa não rende pontos
  }

  redirect('/cadastrar/confirme-seu-email')
}

/**
 * Sempre responde igual, exista ou não a conta — não dá pra descobrir
 * quais e-mails estão cadastrados por aqui.
 */
export async function solicitarRedefinicaoSenha(formData: FormData) {
  const validado = schemaEmail.safeParse(formData.get('email'))
  if (!validado.success) return { erro: validado.error.issues[0].message, enviado: false }

  const porIp = await dentroDoLimite(`reset-senha-ip:${ipDoRequest()}`, 5, 60 * 60)
  const porEmail = await dentroDoLimite(`reset-senha-email:${validado.data}`, 3, 60 * 60)
  if (!porIp || !porEmail) {
    return { erro: 'Muitos pedidos seguidos. Aguarde um pouco antes de pedir outro link.', enviado: false }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(validado.data, {
    redirectTo: `${urlDoSite()}/auth/callback?next=/redefinir-senha`,
  })
  if (error && /rate limit/i.test(error.message)) {
    return { erro: traduzirErroAuth(error.message), enviado: false }
  }
  return { erro: null, enviado: true }
}

export async function redefinirSenha(formData: FormData) {
  const senha = schemaSenha.safeParse(formData.get('senha'))
  if (!senha.success) return { erro: senha.error.issues[0].message }
  if (formData.get('senha') !== formData.get('confirmacao')) return { erro: 'As duas senhas não são iguais.' }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'O link expirou. Peça um novo em "Esqueci minha senha".' }

  const { error } = await supabase.auth.updateUser({ password: senha.data })
  if (error) return { erro: traduzirErroAuth(error.message) }

  redirect('/perfil?senha=alterada')
}

export async function sair() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/')
}
