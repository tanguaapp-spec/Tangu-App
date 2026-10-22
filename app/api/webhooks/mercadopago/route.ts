import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validarAssinaturaWebhook } from '@/lib/pagamentos/assinatura-webhook'
import { processarNotificacao } from '@/lib/pagamentos/processar-evento'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'

export const dynamic = 'force-dynamic'

/**
 * Webhook do Mercado Pago (configurar em Suas integrações → Webhooks,
 * eventos: Planos e assinaturas + Pagamentos; URL:
 * https://<domínio>/api/webhooks/mercadopago).
 *
 * 1. Valida x-signature (HMAC) — sem isso, 401 e nada é processado.
 * 2. Registra o evento em eventos_webhook (idempotente por id da notificação).
 * 3. Processa buscando o recurso na API do MP (nunca confia no corpo).
 * 4. Responde 200 só depois de processar; em falha responde 500 pro MP
 *    tentar de novo (e o cron também reprocessa).
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  let corpo: any = null
  try {
    corpo = await request.json()
  } catch {
    corpo = null
  }

  const dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? (corpo?.data?.id ? String(corpo.data.id) : null)
  const tipo = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? corpo?.type ?? corpo?.topic ?? null
  const xRequestId = request.headers.get('x-request-id')

  const verificacao = validarAssinaturaWebhook({
    xSignature: request.headers.get('x-signature'),
    xRequestId,
    dataId,
    segredo: process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() ?? '',
  })

  const db = createServiceClient()
  const chave = String(corpo?.id ?? xRequestId ?? `${tipo}:${dataId}:${Date.now()}`)

  // só o essencial do corpo — sem dados pessoais
  const payloadSeguro = corpo
    ? { action: corpo.action, type: corpo.type, live_mode: corpo.live_mode, date_created: corpo.date_created, data: { id: dataId } }
    : null

  if (!verificacao.valida) {
    await db.from('eventos_webhook').upsert(
      {
        provedor: 'mercadopago',
        chave_idempotencia: `invalido:${chave}`,
        tipo,
        recurso_id: dataId,
        assinatura_valida: false,
        status: 'ignorado',
        erro: verificacao.motivo,
        payload: payloadSeguro,
      },
      { onConflict: 'provedor,chave_idempotencia', ignoreDuplicates: true }
    )
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 })
  }

  if (!tipo || !dataId) {
    return NextResponse.json({ ok: true, ignorado: 'sem tipo ou id' })
  }

  const { data: existente } = await db
    .from('eventos_webhook')
    .select('id, status, tentativas')
    .eq('provedor', 'mercadopago')
    .eq('chave_idempotencia', chave)
    .maybeSingle()

  if (existente && (existente.status === 'processado' || existente.status === 'ignorado')) {
    return NextResponse.json({ ok: true, duplicado: true })
  }

  let eventoId = existente?.id as string | undefined
  if (!eventoId) {
    const { data: novo, error } = await db
      .from('eventos_webhook')
      .insert({
        provedor: 'mercadopago',
        chave_idempotencia: chave,
        tipo,
        recurso_id: dataId,
        assinatura_valida: true,
        payload: payloadSeguro,
      })
      .select('id')
      .single()
    if (error) {
      // corrida com uma entrega simultânea do mesmo evento: a outra processa
      if (error.code === '23505') return NextResponse.json({ ok: true, duplicado: true })
      return NextResponse.json({ erro: 'falha ao registrar' }, { status: 500 })
    }
    eventoId = novo.id
  }

  try {
    const resultado = await processarNotificacao({ tipo, recursoId: dataId })
    await db
      .from('eventos_webhook')
      .update({
        status: resultado.resultado,
        erro: 'motivo' in resultado ? resultado.motivo : null,
        tentativas: (existente?.tentativas ?? 0) + 1,
        processado_em: new Date().toISOString(),
      })
      .eq('id', eventoId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const mensagem = (err as Error).message ?? 'erro desconhecido'
    await db
      .from('eventos_webhook')
      .update({ status: 'falhou', erro: mensagem.slice(0, 500), tentativas: (existente?.tentativas ?? 0) + 1 })
      .eq('id', eventoId)
    await registrarErro({ mensagem: `Webhook Mercado Pago falhou: ${mensagem}`, contexto: `webhook ${tipo}` })
    return NextResponse.json({ erro: 'falha ao processar' }, { status: 500 })
  }
}
