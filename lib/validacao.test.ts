import { describe, expect, it } from 'vitest'
import { normalizarInstagram, normalizarSite, normalizarTelefoneBR, urlSegura } from './utils'
import { detectarTipoImagem } from './storage/assinatura-imagem'

describe('urlSegura', () => {
  it('bloqueia javascript: e data:', () => {
    expect(urlSegura('javascript:alert(1)')).toBeNull()
    expect(urlSegura(' JavaScript:alert(1)')).toBeNull()
    expect(urlSegura('data:text/html,<script>')).toBeNull()
  })
  it('aceita http(s)', () => {
    expect(urlSegura('https://loja.com.br/x')).toBe('https://loja.com.br/x')
  })
})

describe('normalizarSite', () => {
  it('completa o protocolo', () => expect(normalizarSite('loja.com.br')).toBe('https://loja.com.br/'))
  it('recusa lixo', () => {
    expect(normalizarSite('javascript:alert(1)')).toBeNull()
    expect(normalizarSite('não é site')).toBeNull()
  })
})

describe('normalizarInstagram', () => {
  it.each([['@padaria.a', 'padaria.a'], ['https://instagram.com/padaria_a/', 'padaria_a'], ['padaria', 'padaria']])(
    '%s → %s',
    (entrada, saida) => expect(normalizarInstagram(entrada)).toBe(saida)
  )
  it('recusa caracteres inválidos', () => expect(normalizarInstagram('<script>')).toBeNull())
})

describe('normalizarTelefoneBR', () => {
  it.each([['(21) 97265-2314', '21972652314'], ['+55 21 97265-2314', '21972652314'], ['2126471234', '2126471234']])(
    '%s → %s',
    (entrada, saida) => expect(normalizarTelefoneBR(entrada)).toBe(saida)
  )
  it('recusa número curto', () => expect(normalizarTelefoneBR('12345')).toBeNull())
})

describe('detectarTipoImagem (magic bytes)', () => {
  const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)])
  it('reconhece JPEG, PNG, WebP e GIF', () => {
    expect(detectarTipoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(detectarTipoImagem(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png')
    expect(detectarTipoImagem(bytes(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50))).toBe('image/webp')
    expect(detectarTipoImagem(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif')
  })
  it('recusa HTML/SVG disfarçado de .jpg', () => {
    expect(detectarTipoImagem(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
    expect(detectarTipoImagem(new TextEncoder().encode('<html><script>'))).toBeNull()
  })
})
