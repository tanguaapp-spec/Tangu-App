import { describe, expect, it } from 'vitest'
import { traduzirErroAuth } from './mensagens'
import { caminhoInternoSeguro } from '../site'

describe('traduzirErroAuth', () => {
  it('traduz conta existente e senha curta', () => {
    expect(traduzirErroAuth('User already registered')).toMatch(/Já existe uma conta/)
    expect(traduzirErroAuth('Password should be at least 8 characters')).toMatch(/8 caracteres/)
  })
  it('erro desconhecido não vaza texto do servidor', () => {
    expect(traduzirErroAuth('Database error saving new user')).not.toMatch(/Database/)
  })
})

describe('caminhoInternoSeguro (open redirect)', () => {
  it.each([
    ['/painel', '/painel'],
    ['//evil.com', '/'],
    ['https://evil.com', '/'],
    ['/\\evil.com', '/'],
    [null, '/'],
  ])('%s → %s', (entrada, saida) => expect(caminhoInternoSeguro(entrada as string | null)).toBe(saida))
})
