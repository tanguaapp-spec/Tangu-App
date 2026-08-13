'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'
import { creditarPontos } from '@/lib/gamificacao/pontos'

export async function entrarComEmail(formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

  const podeTentar = await dentroDoLimite(`login:${ipDoRequest()}`, 10, 15 * 60)
  if (!podeTentar) {
    return { erro: 'Muitas tentativas de login. Aguarde alguns minutos e tente de novo.' }
  }

  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    // sem console.error para evitar logs sensíveis
    return { erro: 'E-mail ou senha incorretos.' }
  }

  redirect('/')
}


export async function cadastrarComEmail(formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const nomeCompleto = formData.get('nomeCompleto') as string
  const papel = (formData.get('papel') as string) || 'morador'
  const codigoConvite = (formData.get('codigo_convite') as string) || undefined
  const aceiteTermos = formData.get('aceiteTermos')

  if (aceiteTermos !== 'on') {
    return { erro: 'Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.' }
  }

  const podeCadastrar = await dentroDoLimite(`cadastro:${ipDoRequest()}`, 5, 60 * 60)
  if (!podeCadastrar) {
    return { erro: 'Muitos cadastros a partir deste dispositivo. Aguarde um pouco e tente de novo.' }
  }

  const supabase = createClient()
  const { data: cadastro, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome_completo: nomeCompleto, papel, codigo_convite: codigoConvite },
    },
  })

  if (error) {
    return { erro: error.message || 'Falha ao cadastrar. Tente novamente.' }
  }

  // A linha em perfis já existe nesse ponto (trigger roda na mesma transação
  // do signUp), mesmo antes da confirmação do e-mail — dá pra creditar já.
  // Espera terminar antes do redirect: em serverless a função pode ser
  // congelada logo depois da resposta, então um "fire-and-forget" aqui
  // corre o risco de nunca completar.
  if (cadastro.user) {
    await creditarPontos(cadastro.user.id, 'boas_vindas').catch(() => {})

    if (codigoConvite) {
      const { data: perfilNovo } = await supabase
        .from('perfis')
        .select('convidado_por')
        .eq('id', cadastro.user.id)
        .maybeSingle()
      if (perfilNovo?.convidado_por) {
        await creditarPontos(perfilNovo.convidado_por, 'indicacao').catch(() => {})
      }
    }
  }

  redirect('/cadastrar/confirme-seu-email')
}


export async function sair() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/')
}
