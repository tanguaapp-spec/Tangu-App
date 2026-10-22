import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { reconciliarAssinaturas } from '@/lib/pagamentos/processar-evento'
import { mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Manutenção diária (ver vercel.json). Protegido por CRON_SECRET, igual ao
 * resumo diário. Faz: reconciliação de assinaturas com o Mercado Pago,
 * expiração de planos vencidos, saída de destaque vencido, reprocessamento
 * de webhooks que falharam e limpeza do contador de rate limit.
 */
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ erro: 'CRON_SECRET não configurado.' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const db = createServiceClient()
  const inicio = Date.now()

  const relatorio = mercadoPagoConfigurado() ? await reconciliarAssinaturas() : { pulado: 'MERCADOPAGO_ACCESS_TOKEN ausente' }

  const doisDiasAtras = new Date(Date.now() - 2 * 86400e3).toISOString()
  await db.from('rate_limits').delete().lt('janela_inicio', doisDiasAtras)
  // retenção prometida na política de privacidade
  await db.from('error_logs').delete().lt('criado_em', new Date(Date.now() - 90 * 86400e3).toISOString())
  await db.from('notificacoes').delete().lt('criado_em', new Date(Date.now() - 180 * 86400e3).toISOString())

  await db.from('registros_auditoria').insert({
    acao: 'cron.assinaturas',
    entidade: 'sistema',
    dados: { ...relatorio, duracao_ms: Date.now() - inicio },
  })

  if ('erros' in relatorio && relatorio.erros.length > 0) {
    await registrarErro({
      mensagem: `Reconciliação de assinaturas com ${relatorio.erros.length} erro(s)`,
      contexto: relatorio.erros.slice(0, 3).join(' | '),
    })
  }

  return NextResponse.json(relatorio)
}
