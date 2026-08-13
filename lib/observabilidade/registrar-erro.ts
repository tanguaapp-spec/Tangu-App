import { createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'

/**
 * Log de erro em produção — não substitui Sentry, mas é melhor que
 * "descobrir só quando alguém reclama". Sempre "fire and forget": um
 * problema ao registrar o erro nunca pode quebrar o fluxo principal.
 *
 * Erros de nível "error" (não "warning", pra não gerar ruído demais) também
 * disparam um push pra conta admin, além de ficar salvos em /painel/admin/logs
 * — limitado a 6 avisos por hora no total, pra uma cascata de falhas não virar
 * uma enxurrada de notificações.
 */
export async function registrarErro(params: {
  mensagem: string
  contexto?: string
  stack?: string
  url?: string
  usuarioId?: string | null
  nivel?: 'error' | 'warning'
}) {
  const nivel = params.nivel ?? 'error'
  try {
    const supabase = createServiceClient()
    await supabase.from('error_logs').insert({
      nivel,
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

  if (nivel === 'error') {
    try {
      const podeAvisar = await dentroDoLimite('alerta-erro-admin', 6, 60 * 60)
      if (podeAvisar) {
        await enviarNotificacaoParaAdmins({
          title: '⚠️ Erro em produção no Tanguá App',
          body: params.mensagem.slice(0, 150) + (params.contexto ? ` (${params.contexto.slice(0, 60)})` : ''),
          url: '/painel/admin/logs',
          tag: 'erro-producao',
        })
      }
    } catch (err) {
      console.error('Falha ao notificar admin sobre erro:', err)
    }
  }
}
