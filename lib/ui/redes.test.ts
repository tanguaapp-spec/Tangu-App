import { describe, expect, it } from 'vitest'

import { lerFacebook } from './redes'

describe('facebook do negócio', () => {
  it('aceita endereço completo, curto ou só o nome', () => {
    expect(lerFacebook('https://www.facebook.com/padariasol/')).toBe('padariasol')
    expect(lerFacebook('facebook.com/padariasol')).toBe('padariasol')
    expect(lerFacebook('@padariasol')).toBe('padariasol')
    expect(lerFacebook('padariasol')).toBe('padariasol')
    expect(lerFacebook('javascript:alert(1)')).toBe(false)
  })
})
