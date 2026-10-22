/**
 * Cliente mínimo da API do Mercado Pago (Assinaturas sem plano associado,
 * "preapproval" com status pending → o pagador conclui no init_point).
 *
 * Referências (conferidas em out/2026):
 * - POST/GET/PUT https://api.mercadopago.com/preapproval
 * - GET https://api.mercadopago.com/authorized_payments/{id}
 * - GET https://api.mercadopago.com/v1/payments/{id}
 *
 * Nenhum dado de cartão passa por aqui: o pagador digita no checkout do
 * próprio Mercado Pago. Só guardamos ids e status.
 */

const BASE = 'https://api.mercadopago.com'

export type StatusPreapprovalMP = 'pending' | 'authorized' | 'paused' | 'cancelled'

export type PreapprovalMP = {
  id: string
  status: StatusPreapprovalMP
  external_reference: string | null
  init_point?: string
  next_payment_date?: string | null
  last_modified?: string | null
  date_created?: string | null
  auto_recurring?: { transaction_amount?: number; currency_id?: string }
  summarized?: { charged_quantity?: number | null; last_charged_date?: string | null } | null
}

export type PagamentoAutorizadoMP = {
  id: number | string
  preapproval_id: string
  status: 'scheduled' | 'processed' | 'recycling' | 'cancelled' | string
  transaction_amount?: number
  last_modified?: string | null
  date_created?: string | null
  payment?: { id: number | string; status: string; status_detail?: string } | null
}

export type PagamentoMP = {
  id: number | string
  status: string
  status_detail?: string
  transaction_amount?: number
  currency_id?: string
  date_approved?: string | null
  date_last_updated?: string | null
  external_reference?: string | null
  metadata?: Record<string, unknown> | null
}

export class ErroMercadoPago extends Error {
  constructor(
    message: string,
    public status: number,
    public corpo?: unknown
  ) {
    super(message)
  }
}

export function mercadoPagoConfigurado() {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
}

export interface ClienteMercadoPago {
  criarAssinatura(dados: {
    motivo: string
    referenciaExterna: string
    emailPagador: string
    valor: number
    urlRetorno: string
  }): Promise<PreapprovalMP>
  buscarAssinatura(id: string): Promise<PreapprovalMP>
  atualizarValorAssinatura(id: string, valor: number, motivo: string): Promise<PreapprovalMP>
  cancelarAssinatura(id: string): Promise<PreapprovalMP>
  buscarPagamentoAutorizado(id: string): Promise<PagamentoAutorizadoMP>
  buscarPagamento(id: string): Promise<PagamentoMP>
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, idempotencia?: string): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!token) throw new ErroMercadoPago('MERCADOPAGO_ACCESS_TOKEN não configurado', 0)

  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), 15_000)
  try {
    const resposta = await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(idempotencia ? { 'X-Idempotency-Key': idempotencia } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: controle.signal,
      cache: 'no-store',
    })
    const texto = await resposta.text()
    const json = texto ? JSON.parse(texto) : null
    if (!resposta.ok) {
      // mensagem do MP sem ecoar o corpo enviado (que tem e-mail do pagador)
      throw new ErroMercadoPago(`Mercado Pago ${metodo} ${caminho.split('?')[0]} → ${resposta.status}: ${json?.message ?? 'erro'}`, resposta.status, json)
    }
    return json as T
  } finally {
    clearTimeout(timer)
  }
}

export const clienteMercadoPago: ClienteMercadoPago = {
  criarAssinatura({ motivo, referenciaExterna, emailPagador, valor, urlRetorno }) {
    return chamar<PreapprovalMP>(
      'POST',
      '/preapproval',
      {
        reason: motivo,
        external_reference: referenciaExterna,
        payer_email: emailPagador,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: valor,
          currency_id: 'BRL',
        },
        back_url: urlRetorno,
        status: 'pending',
      },
      // mesma assinatura local nunca gera duas no Mercado Pago
      `preapproval-${referenciaExterna}`
    )
  },
  buscarAssinatura: (id) => chamar('GET', `/preapproval/${encodeURIComponent(id)}`),
  atualizarValorAssinatura: (id, valor, motivo) =>
    chamar('PUT', `/preapproval/${encodeURIComponent(id)}`, {
      reason: motivo,
      auto_recurring: { transaction_amount: valor, currency_id: 'BRL' },
    }),
  cancelarAssinatura: (id) => chamar('PUT', `/preapproval/${encodeURIComponent(id)}`, { status: 'cancelled' }),
  buscarPagamentoAutorizado: (id) => chamar('GET', `/authorized_payments/${encodeURIComponent(id)}`),
  buscarPagamento: (id) => chamar('GET', `/v1/payments/${encodeURIComponent(id)}`),
}
