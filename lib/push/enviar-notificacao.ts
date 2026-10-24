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

type Inscricao = { id: string; endpoint: string; p256dh: string; auth: string }

/** Manda pra uma lista de aparelhos e limpa os que não existem mais. */
async function enviarParaInscricoes(inscricoes: Inscricao[], payload: PayloadNotificacao) {
  if (inscricoes.length === 0) return
  const supabase = createServiceClient()
  const corpo = JSON.stringify(payload)
  const inscricoesExpiradas: string[] = []

  // em lotes, pra um envio pra cidade toda não abrir milhares de conexões de uma vez
  for (let i = 0; i < inscricoes.length; i += 100) {
    await Promise.all(
      inscricoes.slice(i, i + 100).map(async (inscricao) => {
        try {
          await webpush.sendNotification({ endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } }, corpo)
        } catch (err: any) {
          // 404/410 = inscrição não existe mais (desinstalou, trocou de navegador etc.)
          if (err?.statusCode === 404 || err?.statusCode === 410) inscricoesExpiradas.push(inscricao.id)
          else console.error('Erro ao enviar notificação push:', err?.message || err)
        }
      })
    )
  }

  if (inscricoesExpiradas.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', inscricoesExpiradas)
  }
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
  const { data: inscricoes, error } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth').in('perfil_id', perfilIds)
  if (error) {
    console.error('Erro ao buscar inscrições push:', error.message)
    return
  }
  await enviarParaInscricoes(inscricoes ?? [], payload)
}

/**
 * Aparelhos que ativaram notificação sem ter conta (migration 0022).
 * Recebem só o que é da cidade: avisos, eventos e comunicados gerais.
 */
export async function enviarNotificacaoParaVisitantes(payload: PayloadNotificacao) {
  if (!garantirVapidConfigurado()) return
  const { data, error } = await createServiceClient()
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .is('perfil_id', null)
    .limit(20000)
  if (error) {
    console.error('Erro ao buscar visitantes inscritos:', error.message)
    return
  }
  await enviarParaInscricoes(data ?? [], payload)
}

/** Notifica todo mundo que já ativou notificação, com ou sem conta (mural da cidade) */
export async function enviarNotificacaoParaTodosInscritos(payload: PayloadNotificacao) {
  if (!garantirVapidConfigurado()) return
  const { data, error } = await createServiceClient().from('push_subscriptions').select('id, endpoint, p256dh, auth').limit(50000)
  if (error) return
  await enviarParaInscricoes(data ?? [], payload)
}

/** Notificação de confirmação logo depois de ativar (só pra aquele aparelho). */
export async function enviarBoasVindasPush(inscricao: { endpoint: string; p256dh: string; auth: string }) {
  if (!garantirVapidConfigurado()) return false
  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify({
        title: 'Notificações ativadas 🍊',
        body: 'Pronto! Você vai saber das ofertas, eventos e avisos de Tanguá.',
        url: '/',
        tag: 'boas-vindas',
      } satisfies PayloadNotificacao)
    )
    return true
  } catch (err: any) {
    console.error('Falha ao enviar notificação de boas-vindas:', err?.statusCode, err?.body || err?.message)
    // vai pra Logs do admin: 401/403 costuma ser par de chaves VAPID diferente na Vercel
    const { registrarErro } = await import('@/lib/observabilidade/registrar-erro')
    await registrarErro({
      mensagem: `Notificação de teste não chegou (status ${err?.statusCode ?? '?'}): ${String(err?.body || err?.message || '').slice(0, 300)}`,
      contexto: `push boas-vindas · ${new URL(inscricao.endpoint).host}`,
      nivel: 'warning',
    })
    return false
  }
}

/** Notifica todos os admins (aprovação de cadastro/reivindicação, etc.) */
export async function enviarNotificacaoParaAdmins(payload: PayloadNotificacao) {
  if (!garantirVapidConfigurado()) return

  const supabase = createServiceClient()
  const { data: admins, error } = await supabase.from('administradores_plataforma').select('perfil_id')

  if (error || !admins || admins.length === 0) return
  await enviarNotificacaoParaPerfis(
    admins.map((a) => a.perfil_id),
    payload
  )
}
