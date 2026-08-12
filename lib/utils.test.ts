import { describe, it, expect } from 'vitest'
import { cn, formatarTelefoneWhatsapp, linkWhatsapp, formatarDistancia, formatarPrecoBRL } from './utils'

describe('cn', () => {
  it('junta classes truthy e ignora falsy', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
  })
})

describe('formatarTelefoneWhatsapp', () => {
  it('adiciona 55 quando o número não tem', () => {
    expect(formatarTelefoneWhatsapp('21972652314')).toBe('5521972652314')
  })

  it('não duplica o 55 quando já tem', () => {
    expect(formatarTelefoneWhatsapp('5521972652314')).toBe('5521972652314')
  })

  it('remove caracteres não numéricos', () => {
    expect(formatarTelefoneWhatsapp('(21) 97265-2314')).toBe('5521972652314')
  })
})

describe('linkWhatsapp', () => {
  it('gera link sem mensagem', () => {
    expect(linkWhatsapp('21972652314')).toBe('https://wa.me/5521972652314')
  })

  it('gera link com mensagem codificada', () => {
    const link = linkWhatsapp('21972652314', 'Olá! Vi seu perfil.')
    expect(link).toBe('https://wa.me/5521972652314?text=Ol%C3%A1!%20Vi%20seu%20perfil.')
  })
})

describe('formatarDistancia', () => {
  it('mostra metros quando menor que 1km', () => {
    expect(formatarDistancia(0.35)).toBe('350 m')
  })

  it('mostra km com uma casa decimal quando maior ou igual a 1km', () => {
    expect(formatarDistancia(3.456)).toBe('3.5 km')
  })
})

describe('formatarPrecoBRL', () => {
  it('formata preço fixo em reais', () => {
    expect(formatarPrecoBRL(35)).toContain('35,00')
  })

  it('adiciona "a partir de" quando pedido', () => {
    expect(formatarPrecoBRL(50, true).startsWith('a partir de')).toBe(true)
  })
})
