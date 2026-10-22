import { describe, expect, it } from 'vitest'
import { ARTIGOS, buscarArtigos } from './artigos'

describe('central de ajuda', () => {
  it('slugs únicos', () => {
    expect(new Set(ARTIGOS.map((a) => a.slug)).size).toBe(ARTIGOS.length)
  })

  it('links dos artigos são internos', () => {
    for (const a of ARTIGOS) for (const l of a.links ?? []) expect(l.href.startsWith('/')).toBe(true)
  })

  it.each([
    ['esqueci a senha', 'recuperar-acesso'],
    ['como cancelar assinatura', 'planos-e-pagamentos'],
    ['zap do negocio', 'configurar-whatsapp'],
    ['nao quero mostrar meu endereço', 'profissional-autonomo'],
    ['apagar minha conta lgpd', 'meus-dados'],
  ])('"%s" encontra %s primeiro', (termo, slug) => {
    expect(buscarArtigos(termo)[0]?.slug).toBe(slug)
  })

  it('termo curto ou vazio não devolve tudo', () => {
    expect(buscarArtigos('')).toEqual([])
    expect(buscarArtigos('a e')).toEqual([])
  })

  it('artigos não fixam preço em reais (preço vem do banco)', () => {
    for (const a of ARTIGOS) expect(JSON.stringify(a)).not.toMatch(/R\$\s*\d/)
  })
})
