import { describe, expect, it } from 'vitest'
import { limitesDoMes, mesAtual, mesValido, nomeDoMes, ultimosMeses } from './ranking'
import { seloPrincipal } from './selos'

describe('ranking do mês', () => {
  it('o mês vira à meia-noite de Tanguá', () => {
    expect(mesAtual(new Date('2026-11-01T02:00:00Z'))).toBe('2026-10') // 23h do dia 31 aqui
    expect(mesAtual(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11')
    const { inicio, fim } = limitesDoMes('2026-12')
    expect(inicio.toISOString()).toBe('2026-12-01T03:00:00.000Z')
    expect(fim.toISOString()).toBe('2027-01-01T03:00:00.000Z')
  })

  it('lista os últimos meses e dá nome a eles', () => {
    expect(ultimosMeses(3, new Date('2026-01-15T12:00:00Z'))).toEqual(['2026-01', '2025-12', '2025-11'])
    expect(nomeDoMes('2026-10')).toBe('outubro de 2026')
  })

  it('aceita só mês no formato AAAA-MM', () => {
    expect(mesValido('2026-10')).toBe(true)
    expect(mesValido('2026-13')).toBe(false)
    expect(mesValido("2026-10' or 1=1")).toBe(false)
    expect(mesValido(undefined)).toBe(false)
  })
})

describe('selo ao lado do nome', () => {
  it('mostra o selo mais alto', () => {
    expect(seloPrincipal(0, 0)).toBeNull()
    expect(seloPrincipal(1, 0)?.rotulo).toBe('Primeira Avaliação')
    expect(seloPrincipal(1, 5)?.rotulo).toBe('Explorador de Tanguá')
    expect(seloPrincipal(3, 9)?.rotulo).toBe('Vizinho Ativo')
    expect(seloPrincipal(12, 0)?.rotulo).toBe('Vizinho Nota 10')
  })
})
