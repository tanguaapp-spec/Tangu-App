import { createServiceClient } from '@/lib/supabase/server'

/**
 * Log de erro em produção — não substitui Sentry, mas é melhor que
 * "descobrir só quando alguém reclama". Sempre "fire and forget": um
 * problema ao registrar o erro nunca pode quebrar o fluxo principal.
 */
export async function registrarErro(params: {
  mensagem: string
  contexto?: string
  stack?: string
  url?: string
  usuarioId?: string | null
  nivel?: 'error' | 'warning'
}) {
  try {
    const supabase = createServiceClient()
    await supabase.from('error_logs').insert({
      nivel: params.nivel ?? 'error',
      mensagem: params.mensagem.slice(0, 2000),
      contexto: params.contexto?.slice(0, 500) ?? null,
      stack: params.stack?.slice(0, 4000) ?? null,
      url: params.url?.slice(0, 500) ?? null,
      usuario_id: params.usuarioId ?? null,
    })
  } catch (err) {
    // se nem o log funcionar, só avisa no console — nunca propaga
    console.error('Falha ao registrar erro em error_logs:', err)
  }
}
