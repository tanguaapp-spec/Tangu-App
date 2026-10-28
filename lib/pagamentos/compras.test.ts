import { describe, expect, it } from 'vitest'
import { proximoEstadoCompra } from './compras'

const agora = new Date('2026-11-01T12:00:00Z')
const base = { status: 'aguardando_pagamento' as const, dias: 7, servico_id: 'banner_home', termina_em: null }
const aprovado = { status: 'aprovado' as const, pagoEm: '2026-11-01T11:59:00Z', valorPago: 49.9, valorEsperado: 4990 }

describe('compra de divulgação', () => {
  it('banner aprovado fica "pago" esperando a arte (não entra no ar sozinho)', () => {
    expect(proximoEstadoCompra(base, aprovado, agora)).toEqual({ status: 'pago', pago_em: '2026-11-01T11:59:00Z' })
  })

  it('destaque na busca entra no ar na hora, pelo número de dias comprado', () => {
    const r = proximoEstadoCompra({ ...base, servico_id: 'destaque_busca' }, aprovado, agora)
    expect(r?.status).toBe('no_ar')
    expect(r?.termina_em).toBe('2026-11-08T12:00:00.000Z')
  })

  it('valor pago menor que o cobrado não libera', () => {
    expect(proximoEstadoCompra(base, { ...aprovado, valorPago: 1 }, agora)).toBeNull()
  })

  it('recusado marca recusada; pendente não muda nada', () => {
    expect(proximoEstadoCompra(base, { ...aprovado, status: 'recusado' }, agora)).toEqual({ status: 'recusada' })
    expect(proximoEstadoCompra(base, { ...aprovado, status: 'em_processo' }, agora)).toBeNull()
  })

  it('aprovar de novo (webhook repetido) não mexe em compra já paga', () => {
    expect(proximoEstadoCompra({ ...base, status: 'pago' }, aprovado, agora)).toBeNull()
    expect(proximoEstadoCompra({ ...base, status: 'no_ar' }, aprovado, agora)).toBeNull()
  })

  it('estorno derruba a compra em qualquer fase ativa', () => {
    expect(proximoEstadoCompra({ ...base, status: 'no_ar' }, { ...aprovado, status: 'estornado' }, agora)).toEqual({ status: 'estornada' })
    expect(proximoEstadoCompra({ ...base, status: 'encerrada' }, { ...aprovado, status: 'estornado' }, agora)).toBeNull()
  })
})
