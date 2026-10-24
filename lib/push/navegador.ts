'use client'

import { desinscreverPush, inscreverPush } from '@/lib/actions/push-actions'

/**
 * Notificações no navegador/app instalado. Só roda no cliente.
 *
 * iPhone: o Safari só deixa ativar notificação depois que o app foi
 * adicionado à Tela de Início (iOS 16.4+) e aberto por lá.
 */
export type EstadoPush = 'indisponivel' | 'precisa-instalar' | 'inativo' | 'ativo' | 'negado'

export const ehIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)
export const ehAndroid = () => typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
export const instalado = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true)

function base64ParaBytes(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const bruto = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

async function registro() {
  // o service worker é registrado no carregamento (RegistrarServiceWorker); aqui só espera ficar pronto
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, rejeitar) => setTimeout(() => rejeitar(new Error('service worker não ficou pronto')), 20000)),
  ])
}

export async function estadoPush(): Promise<EstadoPush> {
  if (typeof window === 'undefined') return 'indisponivel'
  const temApi = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!temApi) return ehIOS() && !instalado() ? 'precisa-instalar' : 'indisponivel'
  if (Notification.permission === 'denied') return 'negado'
  // sem permissão ainda não existe inscrição: responde na hora, sem esperar o service worker
  // (na primeira visita ele ainda está instalando e pode levar vários segundos)
  if (Notification.permission === 'default') return 'inativo'
  try {
    const r = await registro()
    return (await r.pushManager.getSubscription()) ? 'ativo' : 'inativo'
  } catch {
    return 'inativo'
  }
}

/** Pede permissão, inscreve o aparelho e salva no servidor (com ou sem conta). */
export async function ativarPush(): Promise<{ ok: boolean; erro?: string; estado: EstadoPush }> {
  const chave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!chave) return { ok: false, erro: 'Notificações ainda não configuradas.', estado: 'indisponivel' }
  const antes = await estadoPush()
  if (antes === 'precisa-instalar' || antes === 'indisponivel') return { ok: false, estado: antes }
  try {
    const permissao = await Notification.requestPermission()
    if (permissao !== 'granted') return { ok: false, estado: permissao === 'denied' ? 'negado' : 'inativo' }
    const r = await registro()
    const inscricao = (await r.pushManager.getSubscription()) ?? (await r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ParaBytes(chave) }))
    const json = inscricao.toJSON()
    const res = await inscreverPush({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } }, navigator.userAgent)
    if (res.erro) return { ok: false, erro: res.erro, estado: 'inativo' }
    return { ok: true, estado: 'ativo' }
  } catch (err) {
    console.error('Erro ao ativar notificações:', err)
    return { ok: false, erro: 'Não foi possível ativar agora. Tente de novo.', estado: 'inativo' }
  }
}

export async function desativarPush(): Promise<EstadoPush> {
  try {
    const r = await registro()
    const inscricao = await r.pushManager.getSubscription()
    if (inscricao) {
      await desinscreverPush(inscricao.endpoint)
      await inscricao.unsubscribe()
    }
    return 'inativo'
  } catch {
    return 'ativo'
  }
}

/** Já ativo neste aparelho: reenvia ao servidor (ex.: a pessoa acabou de entrar na conta e "adota" a inscrição). */
export async function sincronizarPush() {
  try {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return
    const r = await registro()
    const inscricao = await r.pushManager.getSubscription()
    if (!inscricao) return
    const json = inscricao.toJSON()
    await inscreverPush({ endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } }, navigator.userAgent)
  } catch {
    // sem rede ou sem service worker: tenta na próxima visita
  }
}
