import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/server'

let vapidConfigurado = false

function garantirVapidConfigurado() {
  if (vapidConfigurado) return true

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'https://tangua-app.vercel.app'

  if (!publicKey || !privateKey) {
    console.warn('Notificação Web Push não enviada: VAPID_PRIVATE_KEY/NEXT_PUBLIC_VAPID_PUBLIC_KEY não configuradas.')
    return false
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigurado = true
  return true
}

export type PayloadNotificacao = {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Envia notificação push pra todos os dispositivos inscritos dos perfis
 * informados. Roda com a service role (ignora RLS) — uso restrito a
 * server actions confiáveis, nunca exposto diretamente ao client.
 */
export async function enviarNotificacaoParaPerfis(perfilIds: string[], payload: PayloadNotificacao) {
  if (perfilIds.length === 0) return
  if (!garantirVapidConfigurado()) return

  const supabase = createServiceClient()
  const { data: inscricoes, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('perfil_id', perfilIds)

  if (error) {
    console.error('Erro ao buscar inscrições push:', error.message)
    return
  }
  if (!inscricoes || inscricoes.length === 0) return

  const corpo = JSON.stringify(payload)
  const inscricoesExpiradas: string[] = []

  await Promise.all(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
          },
          corpo
        )
      } catch (err: any) {
        // 404/410 = inscrição não existe mais (usuário desinstalou, trocou de navegador etc.)
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          inscricoesExpiradas.push(inscricao.id)
        } else {
          console.error('Erro ao enviar notificação push:', err?.message || err)
        }
      }
    })
  )

  if (inscricoesExpiradas.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', inscricoesExpiradas)
  }
}

/** Notifica todo mundo que já ativou notificação (usado pro mural da cidade) */
export async function enviarNotificacaoParaTodosInscritos(payload: PayloadNotificacao) {
  if (!garantirVapidConfigurado()) return

  const supabase = createServiceClient()
  const { data: inscricoes, error } = await supabase.from('push_subscriptions').select('perfil_id')

  if (error || !inscricoes || inscricoes.length === 0) return
  const perfilIds = Array.from(new Set(inscricoes.map((i) => i.perfil_id)))
  await enviarNotificacaoParaPerfis(perfilIds, payload)
}

/** Notifica todos os admins (aprovação de cadastro/reivindicação, etc.) */
export async function enviarNotificacaoParaAdmins(payload: PayloadNotificacao) {
  if (!garantirVapidConfigurado()) return

  const supabase = createServiceClient()
  const { data: admins, error } = await supabase.from('perfis').select('id').eq('papel', 'admin')

  if (error || !admins || admins.length === 0) return
  await enviarNotificacaoParaPerfis(
    admins.map((a) => a.id),
    payload
  )
}
