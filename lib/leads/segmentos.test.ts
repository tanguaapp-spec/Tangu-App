import { describe, expect, it } from 'vitest'
import { linkWhatsapp, pontuacao, sugestao, temperatura } from './segmentos'

const sinais = { nome: 'Padaria Pão Quente', visitas30d: 23, cliquesWhats30d: 5, favoritos30d: 1 }

describe('leads', () => {
  it('clique no WhatsApp pesa mais que visita', () => {
    expect(pontuacao({ visitas30d: 0, cliquesWhats30d: 5, favoritos30d: 0 })).toBeGreaterThan(pontuacao({ visitas30d: 20, cliquesWhats30d: 0, favoritos30d: 0 }))
  })

  it('negócio grátis com movimento é quente; parado é frio', () => {
    expect(temperatura('quente', sinais)).toBe('quente')
    expect(temperatura('nao_reivindicado', { ...sinais, visitas30d: 1, cliquesWhats30d: 0, favoritos30d: 0 })).toBe('frio')
  })

  it('mensagem usa os números reais do negócio', () => {
    const s = sugestao('quente', sinais)
    expect(s.mensagem).toContain('23 visitas e 5 cliques')
    expect(s.parecer).toMatch(/Essencial/)
  })

  it('perfil não reivindicado sempre oferece ocultar', () => {
    expect(sugestao('nao_reivindicado', sinais).mensagem).toMatch(/oculta/)
  })

  it('WhatsApp aceita número com ou sem 55 e recusa número curto', () => {
    expect(linkWhatsapp('(21) 99999-1234', 'oi')).toBe('https://wa.me/5521999991234?text=oi')
    expect(linkWhatsapp('+55 21 3333-1234', 'oi')).toBe('https://wa.me/552133331234?text=oi')
    expect(linkWhatsapp('1234', 'oi')).toBeNull()
  })
})
