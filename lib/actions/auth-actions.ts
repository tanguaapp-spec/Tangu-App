'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function entrarComEmail(formData: FormData) {
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string

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


  const supabase = createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome_completo: nomeCompleto, papel },
    },
  })

  if (error) {
    return { erro: error.message || 'Falha ao cadastrar. Tente novamente.' }
  }

  redirect('/cadastrar/confirme-seu-email')
}


export async function sair() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/')
}

