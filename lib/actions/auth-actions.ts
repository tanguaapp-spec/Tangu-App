'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function entrarComEmail(formData: FormData) {
  console.log('[LOG] Iniciando login com email');
  const email = formData.get('email') as string
  console.log('[LOG] Email:', email);
  const senha = formData.get('senha') as string

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  console.log('[LOG] Login response:', { data: data ? 'data received' : null, error: error?.message });

  if (error) {
    console.error('[ERROR] Login failed:', error);
    return { erro: 'E-mail ou senha incorretos.' }
  }

  console.log('[LOG] Login successful, redirecting to /');
  redirect('/')
}

export async function cadastrarComEmail(formData: FormData) {
  console.log('[LOG] Iniciando cadastro');
  const email = formData.get('email') as string
  const senha = formData.get('senha') as string
  const nomeCompleto = formData.get('nomeCompleto') as string
  const papel = (formData.get('papel') as string) || 'morador'
  console.log('[LOG] Cadastro params:', { email, nomeCompleto, papel });

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome_completo: nomeCompleto, papel },
    },
  })
  console.log('[LOG] SignUp response:', { data: data ? 'data received' : null, error: error?.message });

  if (error) {
    console.error('[ERROR] SignUp failed:', error);
    return { erro: error.message }
  }

  console.log('[LOG] SignUp successful, redirecting to /cadastrar/confirme-seu-email');
  redirect('/cadastrar/confirme-seu-email')
}

export async function sair() {
  console.log('[LOG] Iniciando signOut');
  const supabase = createClient()
  await supabase.auth.signOut()
  console.log('[LOG] SignOut complete, redirecting to /');
  redirect('/')
}
