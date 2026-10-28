import { z } from 'zod'

export type OpcaoServico = { dias: number; preco_centavos: number }

const opcao = z.object({ dias: z.number().int().min(0).max(365), preco_centavos: z.number().int().min(100) })

/** Opções de período/preço guardadas no banco; ignora linha inválida em vez de quebrar a tela. */
export function lerOpcoesServico(bruto: unknown): OpcaoServico[] {
  if (!Array.isArray(bruto)) return []
  return bruto.flatMap((o) => {
    const r = opcao.safeParse(o)
    return r.success ? [r.data] : []
  })
}

export function rotuloPeriodo(dias: number) {
  return dias === 0 ? 'Entrega única' : `${dias} dias`
}

export const ROTULO_STATUS_COMPRA: Record<string, { texto: string; tom: 'neutro' | 'ok' | 'alerta' | 'erro' }> = {
  aguardando_pagamento: { texto: 'Aguardando pagamento', tom: 'alerta' },
  pago: { texto: 'Pago · combinar a arte', tom: 'ok' },
  no_ar: { texto: 'No ar', tom: 'ok' },
  encerrada: { texto: 'Encerrada', tom: 'neutro' },
  cancelada: { texto: 'Cancelada', tom: 'neutro' },
  recusada: { texto: 'Pagamento recusado', tom: 'erro' },
  estornada: { texto: 'Estornada', tom: 'erro' },
}

/** Link do WhatsApp do time com a mensagem pronta (código da compra pra achar rápido). */
export function linkWhatsappComercial(numero: string, texto: string) {
  const digitos = numero.replace(/\D/g, '')
  if (digitos.length < 10) return null
  const comPais = digitos.startsWith('55') ? digitos : `55${digitos}`
  return `https://wa.me/${comPais}?text=${encodeURIComponent(texto)}`
}
