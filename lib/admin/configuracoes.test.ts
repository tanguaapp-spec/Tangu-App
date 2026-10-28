import { CHAVES_RECURSO } from '@/lib/planos/limites'
import { describe, expect, it } from 'vitest'
import { interpretarConfig, lerLimite, lerPrecoCentavos, schemaPlano } from './configuracoes'

describe('interpretarConfig', () => {
  it('recusa chave desconhecida (não dá pra gravar qualquer coisa)', () => {
    expect(interpretarConfig('qualquer_coisa', '1')).toEqual({ erro: 'Configuração desconhecida.' })
  })
  it('tolerância fora da faixa é recusada', () => {
    expect('erro' in interpretarConfig('assinatura_tolerancia_dias', '90')).toBe(true)
    expect(interpretarConfig('assinatura_tolerancia_dias', '5')).toEqual({ valor: 5 })
  })
  it('lista vira array sem duplicados nem linhas vazias', () => {
    expect(interpretarConfig('termos_sinalizados', 'Pirâmide\n\npirâmide\nrenda extra')).toEqual({ valor: ['pirâmide', 'renda extra'] })
  })
  it('ordem da home só aceita seções conhecidas', () => {
    expect('erro' in interpretarConfig('home_ordem_secoes', 'ofertas\nhackeado')).toBe(true)
  })
  it('e-mail de suporte vazio ou válido', () => {
    expect(interpretarConfig('suporte_email', '')).toEqual({ valor: '' })
    expect('erro' in interpretarConfig('suporte_email', 'não é email')).toBe(true)
  })
})

describe('leitura de formulário de plano', () => {
  it.each([
    ['39,90', 3990],
    ['R$ 79,90', 7990],
    ['1.234,50', 123450],
    ['0', 0],
    ['', 0],
  ])('preço %s → %i centavos', (entrada, saida) => expect(lerPrecoCentavos(entrada)).toBe(saida))

  it('limite vazio = ilimitado', () => {
    expect(lerLimite('')).toBeNull()
    expect(lerLimite('Ilimitado')).toBeNull()
    expect(lerLimite('10')).toBe(10)
  })

  it('schema recusa limite negativo e preço negativo', () => {
    const base = {
      id: 'teste',
      nome: 'Teste',
      preco_centavos: 100,
      ativo: true,
      ordem: 1,
      limites: { max_produtos: 1, max_cupons_ativos: 1, max_posts_mes: 1, max_fotos_galeria: 1 },
      recursos: Object.fromEntries(CHAVES_RECURSO.map((c) => [c, false])),
    }
    expect(schemaPlano.safeParse(base).success).toBe(true)
    expect(schemaPlano.safeParse({ ...base, preco_centavos: -1 }).success).toBe(false)
    expect(schemaPlano.safeParse({ ...base, limites: { ...base.limites, max_produtos: -5 } }).success).toBe(false)
  })
})

describe('lerPrecoCentavos com ponto decimal', () => {
  it('"39.90" é 39 reais e 90 centavos, não 3990 reais', () => expect(lerPrecoCentavos('39.90')).toBe(3990))
  it('"1.500" (milhar) é 1500 reais', () => expect(lerPrecoCentavos('1.500')).toBe(150000))
})
