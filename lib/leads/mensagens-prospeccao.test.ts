import { describe, expect, it } from 'vitest'
import { mensagemProspeccao, versaoSugerida } from './mensagens-prospeccao'

describe('mensagens de prospecção', () => {
  it('principal usa loja, remetente e o que o cliente busca', () => {
    const m = mensagemProspeccao('principal', { loja: 'Auto Peças Silva', remetente: 'Gabriel', busca: 'Autopeças' })
    expect(m).toContain('Vi a Auto Peças Silva no Google Maps')
    expect(m).toContain('Sou o Gabriel, do APP TANGUÁ')
    expect(m).toContain('busca “autopeças”')
  })
  it('autônomo para eletricista e manicure; loja para o resto', () => {
    expect(versaoSugerida('Eletricistas')).toBe('autonomo')
    expect(versaoSugerida('Manicure e pedicure')).toBe('autonomo')
    expect(versaoSugerida('Supermercados')).toBe('principal')
  })
  it('curta e autônomo não mencionam endereço da casa de forma errada', () => {
    expect(mensagemProspeccao('autonomo', { loja: 'João', remetente: 'x' })).toContain('Seu endereço de casa nunca aparece')
    expect(mensagemProspeccao('curta', { loja: 'Bar X', remetente: 'x' })).toContain('Topa?')
  })
})
