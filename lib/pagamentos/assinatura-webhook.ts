import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Valida o header `x-signature` do webhook do Mercado Pago.
 *
 * Formato: `ts=<timestamp>,v1=<hmac hex>`.
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` — partes
 * ausentes na notificação são omitidas. HMAC-SHA256 com a "assinatura
 * secreta" do painel Suas integrações → Webhooks.
 * O `data.id` vem da query string; se for alfanumérico, em minúsculas.
 */
export function validarAssinaturaWebhook(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
  segredo: string
  agoraMs?: number
  /** recusa notificações com ts muito antigo (replay). 0 = não checa. */
  toleranciaMs?: number
}): { valida: boolean; motivo?: string } {
  const { xSignature, xRequestId, dataId, segredo } = params
  if (!segredo) return { valida: false, motivo: 'segredo não configurado' }
  if (!xSignature) return { valida: false, motivo: 'sem x-signature' }

  const partes = Object.fromEntries(
    xSignature.split(',').map((p) => {
      const [chave, ...resto] = p.split('=')
      return [chave?.trim(), resto.join('=').trim()]
    })
  ) as Record<string, string>

  const ts = partes.ts
  const v1 = partes.v1
  if (!ts || !v1) return { valida: false, motivo: 'x-signature malformado' }

  const id = dataId && /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId
  let manifest = ''
  if (id) manifest += `id:${id};`
  if (xRequestId) manifest += `request-id:${xRequestId};`
  manifest += `ts:${ts};`

  const esperado = createHmac('sha256', segredo).update(manifest).digest('hex')
  const a = Buffer.from(esperado, 'utf8')
  const b = Buffer.from(v1.toLowerCase(), 'utf8')
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valida: false, motivo: 'assinatura não confere' }

  const tolerancia = params.toleranciaMs ?? 0
  if (tolerancia > 0) {
    // o MP documenta ts em milissegundos; aceita segundos também por segurança
    const tsMs = ts.length <= 10 ? Number(ts) * 1000 : Number(ts)
    const agora = params.agoraMs ?? Date.now()
    if (!Number.isFinite(tsMs) || Math.abs(agora - tsMs) > tolerancia) {
      return { valida: false, motivo: 'timestamp fora da tolerância' }
    }
  }
  return { valida: true }
}
