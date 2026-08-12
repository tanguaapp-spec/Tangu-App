import { createServiceClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

/**
 * Limita quantas vezes uma chave (ex: "avaliacao:<user-id>") pode passar
 * dentro de uma janela de tempo. Usa uma função atômica no Postgres —
 * sem race condition entre requests concorrentes.
 *
 * Se der erro ao checar (Postgres fora do ar, função não existe ainda
 * porque a migration não rodou), deixa passar — rate limit é defesa
 * extra, não pode virar o motivo do site inteiro parar de funcionar.
 */
export async function dentroDoLimite(chave: string, limite: number, janelaSegundos: number): Promise<boolean> {
  // Bypass só pros testes E2E locais (Playwright bate muitos logins/cadastros
  // da mesma máquina em poucos minutos, o que trombaria com os limites de
  // verdade). `next start` roda com NODE_ENV=production mesmo localmente,
  // então não dá pra usar isso como trava — a proteção real é essa env var
  // nunca existir nas Environment Variables da Vercel (só no .env local,
  // que não é commitado). NUNCA adicionar E2E_RATE_LIMIT_BYPASS no projeto
  // da Vercel.
  if (process.env.E2E_RATE_LIMIT_BYPASS === '1') {
    return true
  }
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('verificar_rate_limit', {
      p_chave: chave,
      p_limite: limite,
      p_janela_segundos: janelaSegundos,
    })
    if (error) {
      console.error('Erro ao checar rate limit:', error.message)
      return true
    }
    return data === true
  } catch (err) {
    console.error('Falha ao checar rate limit:', err)
    return true
  }
}

/** IP do request atual, pra limitar por dispositivo antes de ter usuário logado (ex: cadastro). */
export function ipDoRequest(): string {
  const headerList = headers()
  const encaminhado = headerList.get('x-forwarded-for')
  return encaminhado?.split(',')[0]?.trim() || headerList.get('x-real-ip') || 'desconhecido'
}
