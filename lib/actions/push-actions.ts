'use server'

import { createClient } from '@/lib/supabase/server'

type InscricaoPush = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function inscreverPush(inscricao: InscricaoPush, userAgent?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para ativar notificações.' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      perfil_id: user.id,
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
      user_agent: userAgent || null,
    },
    { onConflict: 'endpoint' }
  )

  if (error) return { erro: error.message }
  return { erro: null }
}

export async function desinscreverPush(endpoint: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('perfil_id', user.id)

  if (error) return { erro: error.message }
  return { erro: null }
}
