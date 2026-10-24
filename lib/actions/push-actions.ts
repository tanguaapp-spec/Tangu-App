'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'
import { endpointPushValido } from '@/lib/push/endpoint'
import { enviarBoasVindasPush } from '@/lib/push/enviar-notificacao'

type InscricaoPush = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

const schema = z.object({
  endpoint: z.string().max(800).refine(endpointPushValido, 'Endereço de notificação inválido.'),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
})

/**
 * Ativa as notificações deste aparelho. Funciona com ou sem conta: sem
 * conta, o aparelho recebe as novidades da cidade (avisos, eventos,
 * comunicados); com conta, recebe também o que é da pessoa (cupom,
 * orçamento, favoritos). Quem entrar depois "adota" a inscrição.
 */
export async function inscreverPush(inscricao: InscricaoPush, userAgent?: string) {
  const v = schema.safeParse(inscricao)
  if (!v.success) return { erro: v.error.issues[0].message }
  if (!(await dentroDoLimite(`push:${ipDoRequest()}`, 20, 60 * 60))) return { erro: 'Muitas tentativas. Tente daqui a pouco.' }

  const {
    data: { user },
  } = await createClient().auth.getUser()
  const db = createServiceClient()

  // não "rouba" de outra conta uma inscrição que já tem dono (aparelho compartilhado
  // continua com quem estava logado até essa pessoa sair ou outra entrar)
  const { data: existente } = await db.from('push_subscriptions').select('perfil_id').eq('endpoint', v.data.endpoint).maybeSingle()
  const perfil = user?.id ?? existente?.perfil_id ?? null

  const { error } = await db.from('push_subscriptions').upsert(
    {
      perfil_id: perfil,
      endpoint: v.data.endpoint,
      p256dh: v.data.keys.p256dh,
      auth: v.data.keys.auth,
      user_agent: userAgent?.slice(0, 300) || null,
      atualizado_em: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )
  if (error) {
    console.error('Falha ao salvar inscrição de push:', error.message)
    // antes da migration 0022 só quem tem conta pode ativar
    if (!user && /perfil_id|null value/.test(error.message)) return { erro: 'Entre na sua conta pra ativar as notificações.' }
    return { erro: 'Não foi possível ativar agora. Tente de novo.' }
  }
  // primeira vez neste aparelho: manda uma de boas-vindas (prova na hora que funcionou)
  if (!existente) {
    const enviada = await enviarBoasVindasPush({ endpoint: v.data.endpoint, p256dh: v.data.keys.p256dh, auth: v.data.keys.auth })
    if (!enviada) return { erro: null, aviso: 'Ativado, mas o teste não chegou. Confira se o celular não está no modo silencioso/“Não perturbe”.' }
  }
  return { erro: null }
}

/** Desativa as notificações deste aparelho (ter o endereço já prova que é o aparelho). */
export async function desinscreverPush(endpoint: string) {
  if (typeof endpoint !== 'string' || !endpointPushValido(endpoint)) return { erro: 'Endereço inválido.' }
  const { error } = await createServiceClient().from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) return { erro: 'Não foi possível desativar agora.' }
  return { erro: null }
}
