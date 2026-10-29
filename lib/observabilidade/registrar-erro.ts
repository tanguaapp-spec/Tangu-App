import { createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { ambienteAtual } from '@/lib/observabilidade/detalhes'

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
/** Sem origem informada, deduz pelo contexto e pela mensagem. */
export function origemPeloContexto(contexto: string | undefined, mensagem: string) {
  const t = `${contexto ?? ''} ${mensagem}`.toLowerCase()
  if (t.startsWith('client')) return 'tela'
  if (/mercado ?pago|webhook|assinatura|pagamento|compra/.test(t)) return 'pagamento'
  if (/cron|rotina|reconcilia/.test(t)) return 'cron'
  if (/push|vapid|notifica/.test(t)) return 'notificacao'
  if (/e-?mail|resend|smtp/.test(t)) return 'email'
  return 'servidor'
}

export async function registrarErro(params: {
  mensagem: string
  contexto?: string
  stack?: string
  url?: string
  usuarioId?: string | null
  nivel?: 'error' | 'warning'
  /** de onde veio: tela, navegador, promessa, acao_sem_resposta, servidor, pagamento, cron… */
  origem?: string
  /** navegador, sistema, tela, ação, status HTTP etc. (ambiente e versão entram sozinhos) */
  detalhes?: Record<string, unknown>
}) {
  const nivel = params.nivel ?? 'error'
  try {
    const supabase = createServiceClient()
    const linha = {
      nivel,
      mensagem: params.mensagem.slice(0, 2000),
      contexto: params.contexto?.slice(0, 500) ?? null,
      stack: params.stack?.slice(0, 8000) ?? null,
      url: params.url?.slice(0, 500) ?? null,
      usuario_id: params.usuarioId ?? null,
    }
    const { error } = await supabase.from('error_logs').insert({
      ...linha,
      origem: params.origem?.slice(0, 40) ?? origemPeloContexto(params.contexto, params.mensagem),
      detalhes: JSON.parse(JSON.stringify({ ...ambienteAtual(), ...(params.detalhes ?? {}) }).slice(0, 8000)),
    })
    // banco ainda sem a 0027: grava sem as colunas novas
    if (error && /origem|detalhes/.test(error.message)) await supabase.from('error_logs').insert(linha)
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
