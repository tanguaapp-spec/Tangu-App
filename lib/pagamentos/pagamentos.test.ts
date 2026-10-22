import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { validarAssinaturaWebhook } from './assinatura-webhook'
import {
  aplicarPagamento,
  aplicarPreapproval,
  expirarSeVencida,
  mapearStatusPagamentoMP,
  type AssinaturaLocal,
} from './estado-assinatura'

const SEGREDO = 'segredo-de-teste'
function assinar(manifest: string) {
  return createHmac('sha256', SEGREDO).update(manifest).digest('hex')
}

describe('validarAssinaturaWebhook', () => {
  const base = { xRequestId: 'req-1', dataId: '12345', segredo: SEGREDO }

  it('aceita assinatura correta', () => {
    const v1 = assinar('id:12345;request-id:req-1;ts:1700000000000;')
    expect(validarAssinaturaWebhook({ ...base, xSignature: `ts=1700000000000,v1=${v1}` }).valida).toBe(true)
  })

  it('id alfanumérico entra em minúsculas no manifest', () => {
    const v1 = assinar('id:abc123;request-id:req-1;ts:1;')
    expect(validarAssinaturaWebhook({ ...base, dataId: 'ABC123', xSignature: `ts=1,v1=${v1}` }).valida).toBe(true)
  })

  it('omite partes ausentes do manifest', () => {
    const v1 = assinar('id:12345;ts:1;')
    expect(validarAssinaturaWebhook({ ...base, xRequestId: null, xSignature: `ts=1,v1=${v1}` }).valida).toBe(true)
  })

  it('recusa assinatura adulterada, outro data.id, ou sem header', () => {
    const v1 = assinar('id:12345;request-id:req-1;ts:1;')
    expect(validarAssinaturaWebhook({ ...base, xSignature: `ts=1,v1=${v1.replace(/.$/, '0')}` }).valida).toBe(false)
    expect(validarAssinaturaWebhook({ ...base, dataId: '99999', xSignature: `ts=1,v1=${v1}` }).valida).toBe(false)
    expect(validarAssinaturaWebhook({ ...base, xSignature: null }).valida).toBe(false)
    expect(validarAssinaturaWebhook({ ...base, xSignature: 'lixo' }).valida).toBe(false)
  })

  it('sem segredo configurado nunca valida', () => {
    const v1 = assinar('id:12345;request-id:req-1;ts:1;')
    expect(validarAssinaturaWebhook({ ...base, segredo: '', xSignature: `ts=1,v1=${v1}` }).valida).toBe(false)
  })

  it('tolerância de tempo opcional recusa replay antigo', () => {
    const v1 = assinar('id:12345;request-id:req-1;ts:1000;')
    const r = validarAssinaturaWebhook({ ...base, xSignature: `ts=1000,v1=${v1}`, toleranciaMs: 60_000, agoraMs: 10_000_000 })
    expect(r.valida).toBe(false)
  })
})

const agora = new Date('2026-10-22T12:00:00Z')
const ctx = { agora, toleranciaDias: 5, proximaCobranca: '2026-11-22T12:00:00Z' }
const pendente: AssinaturaLocal = { status: 'pendente', periodo_atual_inicio: null, periodo_atual_fim: null, tolerancia_ate: null, ultimo_evento_em: null }
const ativa: AssinaturaLocal = {
  status: 'ativa',
  periodo_atual_inicio: '2026-10-01T00:00:00Z',
  periodo_atual_fim: '2026-11-01T00:00:00Z',
  tolerancia_ate: null,
  ultimo_evento_em: '2026-10-01T00:00:00Z',
}

describe('máquina de estados da assinatura', () => {
  it('mapeia status de pagamento do MP', () => {
    expect(mapearStatusPagamentoMP('approved')).toBe('aprovado')
    expect(mapearStatusPagamentoMP('rejected')).toBe('recusado')
    expect(mapearStatusPagamentoMP('charged_back')).toBe('estornado')
    expect(mapearStatusPagamentoMP('qualquer')).toBe('pendente')
  })

  it('débito apenas autorizado NÃO ativa a assinatura', () => {
    const patch = aplicarPreapproval(pendente, { status: 'authorized', ultimaModificacao: agora.toISOString(), proximaCobranca: null }, { agora })
    expect(patch?.status).toBeUndefined()
  })

  it('pagamento pendente não ativa', () => {
    const patch = aplicarPagamento(pendente, { status: 'pendente', pagoEm: null, atualizadoEm: agora.toISOString() }, ctx)
    expect(patch?.status).toBeUndefined()
  })

  it('cobrança aprovada ativa com período até a próxima cobrança', () => {
    const patch = aplicarPagamento(pendente, { status: 'aprovado', pagoEm: agora.toISOString(), atualizadoEm: agora.toISOString() }, ctx)
    expect(patch).toMatchObject({ status: 'ativa', periodo_atual_fim: '2026-11-22T12:00:00Z', tolerancia_ate: null })
  })

  it('sem próxima cobrança informada, período = +1 mês', () => {
    const patch = aplicarPagamento(pendente, { status: 'aprovado', pagoEm: agora.toISOString(), atualizadoEm: null }, { ...ctx, proximaCobranca: null })
    expect(patch?.periodo_atual_fim).toBe('2026-11-22T12:00:00.000Z')
  })

  it('cobrança recusada põe em atraso com tolerância, sem renovar a tolerância', () => {
    const p1 = aplicarPagamento(ativa, { status: 'recusado', pagoEm: null, atualizadoEm: agora.toISOString() }, ctx)!
    expect(p1).toMatchObject({ status: 'em_atraso', tolerancia_ate: '2026-10-27T12:00:00.000Z' })
    const emAtraso = { ...ativa, ...p1 } as AssinaturaLocal
    const depois = new Date('2026-10-25T00:00:00Z')
    const p2 = aplicarPagamento(emAtraso, { status: 'recusado', pagoEm: null, atualizadoEm: depois.toISOString() }, { ...ctx, agora: depois })!
    expect(p2.tolerancia_ate).toBe('2026-10-27T12:00:00.000Z')
  })

  it('pagamento aprovado depois do atraso reativa', () => {
    const emAtraso: AssinaturaLocal = { ...ativa, status: 'em_atraso', tolerancia_ate: '2026-10-27T00:00:00Z' }
    const p = aplicarPagamento(emAtraso, { status: 'aprovado', pagoEm: agora.toISOString(), atualizadoEm: agora.toISOString() }, ctx)
    expect(p).toMatchObject({ status: 'ativa', tolerancia_ate: null })
  })

  it('estorno corta o acesso na hora', () => {
    const p = aplicarPagamento(ativa, { status: 'estornado', pagoEm: null, atualizadoEm: agora.toISOString() }, ctx)
    expect(p).toMatchObject({ status: 'em_atraso', tolerancia_ate: agora.toISOString() })
  })

  it('evento fora de ordem (mais velho que o último aplicado) é ignorado', () => {
    const p = aplicarPagamento(ativa, { status: 'recusado', pagoEm: null, atualizadoEm: '2026-09-01T00:00:00Z' }, ctx)
    expect(p).toBeNull()
  })

  it('pagamento atrasado não reabre assinatura cancelada', () => {
    const cancelada: AssinaturaLocal = { ...ativa, status: 'cancelada' }
    const p = aplicarPagamento(cancelada, { status: 'aprovado', pagoEm: agora.toISOString(), atualizadoEm: agora.toISOString() }, ctx)
    expect(p?.status).toBeUndefined()
  })

  it('cancelar ativa mantém o período pago; cancelar pendente expira', () => {
    const p1 = aplicarPreapproval(ativa, { status: 'cancelled', ultimaModificacao: agora.toISOString(), proximaCobranca: null }, { agora })
    expect(p1).toMatchObject({ status: 'cancelada' })
    expect(p1?.periodo_atual_fim).toBeUndefined()
    const p2 = aplicarPreapproval(pendente, { status: 'cancelled', ultimaModificacao: agora.toISOString(), proximaCobranca: null }, { agora })
    expect(p2?.status).toBe('expirada')
  })

  it('cron expira em_atraso após a tolerância e cancelada após o período', () => {
    expect(expirarSeVencida({ ...ativa, status: 'em_atraso', tolerancia_ate: '2026-10-21T00:00:00Z' }, agora)).toEqual({ status: 'expirada' })
    expect(expirarSeVencida({ ...ativa, status: 'em_atraso', tolerancia_ate: '2026-10-30T00:00:00Z' }, agora)).toBeNull()
    expect(expirarSeVencida({ ...ativa, status: 'cancelada', periodo_atual_fim: '2026-10-01T00:00:00Z' }, agora)).toEqual({ status: 'expirada' })
    expect(expirarSeVencida(ativa, agora)).toBeNull()
  })
})
