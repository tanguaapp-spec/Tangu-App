import { describe, expect, it } from 'vitest'
import { situacaoLimite, traduzirErroBanco } from './limites'

describe('traduzirErroBanco', () => {
  it('limite de plano vira mensagem com orientação', () => {
    const m = traduzirErroBanco({ message: 'LIMITE_PLANO:max_produtos', code: 'P0001' })
    expect(m).toMatch(/limite de produtos\/serviços ativos/)
    expect(m).toMatch(/Plano e assinatura/)
  })
  it('RLS vira "sem permissão" sem detalhes internos', () => {
    const m = traduzirErroBanco({ message: 'new row violates row-level security policy for table "negocios"', code: '42501' })
    expect(m).toBe('Você não tem permissão pra fazer isso.')
    expect(m).not.toMatch(/negocios/)
  })
  it('erro desconhecido não vaza a mensagem do banco', () => {
    expect(traduzirErroBanco({ message: 'relation "x" does not exist' })).not.toMatch(/relation/)
  })
})

describe('situacaoLimite', () => {
  it.each([
    [0, null, 'livre'],
    [7, 10, 'livre'],
    [8, 10, 'perto'],
    [10, 10, 'cheio'],
    [0, 1, 'livre'],
    [1, 1, 'cheio'],
  ] as const)('uso %s de %s → %s', (uso, limite, esperado) => expect(situacaoLimite(uso, limite)).toBe(esperado))
})
