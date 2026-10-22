import { describe, expect, it } from 'vitest'
import { mensagemErroCupom, percentualDesconto, situacaoOferta } from './desconto'

describe('percentualDesconto', () => {
  it.each([
    [10000, 8000, 20],
    [3990, 2990, 25], // 25,06% → 25
    [999, 666, 33], // 33,33% → 33 (nunca arredonda pra cima)
    [100, 1, 99],
  ])('de %i por %i → %i%%', (de, por, pct) => expect(percentualDesconto(de, por)).toBe(pct))

  it('sem preço ou "desconto" negativo → não mostra percentual', () => {
    expect(percentualDesconto(null, 100)).toBeNull()
    expect(percentualDesconto(1000, null)).toBeNull()
    expect(percentualDesconto(1000, 1000)).toBeNull()
    expect(percentualDesconto(1000, 1500)).toBeNull()
  })
})

describe('situacaoOferta', () => {
  const agora = new Date('2026-10-22T12:00:00Z')
  const base = { ativo: true, inicia_em: '2026-10-20T00:00:00Z', expira_em: '2026-10-25T00:00:00Z' }
  it('ativa / agendada / expirada / suspensa / esgotada', () => {
    expect(situacaoOferta(base, agora)).toBe('ativa')
    expect(situacaoOferta({ ...base, inicia_em: '2026-10-23T00:00:00Z' }, agora)).toBe('agendada')
    expect(situacaoOferta({ ...base, expira_em: '2026-10-21T00:00:00Z' }, agora)).toBe('expirada')
    expect(situacaoOferta({ ...base, ativo: false }, agora)).toBe('suspensa')
    expect(situacaoOferta({ ...base, limite_resgates: 5, resgates_count: 5 }, agora)).toBe('esgotada')
  })
})

describe('mensagemErroCupom', () => {
  it('traduz o código do banco', () => {
    expect(mensagemErroCupom('CUPOM:esgotado')).toBe('Esse cupom esgotou.')
    expect(mensagemErroCupom('algo estranho')).toMatch(/Não foi possível/)
  })
})
