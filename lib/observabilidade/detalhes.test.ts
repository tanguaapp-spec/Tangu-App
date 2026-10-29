import { describe, expect, it } from 'vitest'
import { lerUserAgent } from './detalhes'

describe('user-agent legível', () => {
  it('iPhone com Safari', () => {
    expect(lerUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1')).toEqual({
      navegador: 'Safari 17',
      sistema: 'iOS 17.4',
      celular: true,
    })
  })
  it('Android com Chrome e Samsung Internet', () => {
    expect(lerUserAgent('Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36')).toMatchObject({ navegador: 'Chrome 129', sistema: 'Android 13' })
    expect(lerUserAgent('Mozilla/5.0 (Linux; Android 12) SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36').navegador).toBe('Samsung Internet 25')
  })
  it('vazio não quebra', () => {
    expect(lerUserAgent(null)).toEqual({ navegador: 'desconhecido', sistema: 'desconhecido', celular: false })
  })
})
