import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import type { TipoEventoPerfil } from '@/lib/types/database'

/**
 * Definições (mostradas também no painel do negócio):
 * - visualizacao: abertura do perfil público por um visitante distinto,
 *   contada no máximo 1x a cada 6h por visitante. Não conta o próprio dono
 *   nem robôs (user-agent de crawler).
 * - clique_whatsapp: clique no botão de WhatsApp, no máximo 1x por hora por
 *   visitante.
 * - favorito: alguém favoritou (só a 1ª vez de cada pessoa conta — desfavoritar
 *   e favoritar de novo não infla).
 *
 * Visitante = usuário logado, ou hash(IP + user-agent) sem guardar o IP.
 *
 * Fora de arquivo 'use server' DE PROPÓSITO: exportar daqui não vira
 * endpoint chamável pelo navegador.
 */
const JANELA_SEGUNDOS: Record<TipoEventoPerfil, number> = {
  visualizacao: 6 * 60 * 60,
  clique_whatsapp: 60 * 60,
  favorito: 10 * 365 * 24 * 60 * 60,
}

const ROBOS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|embedly|lighthouse|headless/i

export function ehRobo(userAgent: string | null | undefined) {
  return !userAgent || ROBOS.test(userAgent)
}

export function identificadorVisitante(usuarioId: string | null, ip: string, userAgent: string) {
  if (usuarioId) return `u:${usuarioId}`
  const sal = process.env.METRICAS_SAL ?? 'tangua-metricas'
  return `a:${createHash('sha256').update(`${sal}|${ip}|${userAgent}`).digest('hex').slice(0, 32)}`
}

export async function registrarEventoPerfil(
  negocioId: string,
  tipo: TipoEventoPerfil,
  contexto: { usuarioId: string | null; donoId?: string | null }
) {
  try {
    if (contexto.usuarioId && contexto.donoId && contexto.usuarioId === contexto.donoId) return

    const h = headers()
    const userAgent = h.get('user-agent') ?? ''
    if (tipo !== 'favorito' && ehRobo(userAgent)) return

    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'desconhecido'
    const visitante = identificadorVisitante(contexto.usuarioId, ip, userAgent)
    const primeiraVez = await dentroDoLimite(`evt:${tipo}:${negocioId}:${visitante}`, 1, JANELA_SEGUNDOS[tipo])
    if (!primeiraVez) return

    await createServiceClient().from('eventos_perfil').insert({ negocio_id: negocioId, tipo })
  } catch (err) {
    console.error('Falha ao registrar evento de perfil:', err)
  }
}
