import { describe, expect, it } from 'vitest'
import { metaNegocio, notaNegocio, prazoCurto, precoCurto, seloOferta, urlNegocio } from './apresentacao'

describe('apresentação', () => {
  it('url usa o slug quando existe', () => {
    expect(urlNegocio({ id: 'abc', slug: 'salao-da-ana' })).toBe('/negocio/salao-da-ana')
    expect(urlNegocio({ id: 'abc', slug: null })).toBe('/negocio/abc')
  })

  it('nota da comunidade tem prioridade sobre a do Google', () => {
    expect(notaNegocio({ id: '1', nome: 'x', nota_media: '4.5', total_avaliacoes: 3, nota_google: 4.9 })).toEqual({ nota: 4.5, total: 3, fonte: 'comunidade' })
    expect(notaNegocio({ id: '1', nome: 'x', nota_media: null, total_avaliacoes: 0, nota_google: 4.9 })?.fonte).toBe('google')
  })

  it('meta do cartão', () => {
    expect(metaNegocio({ id: '1', nome: 'x', categoria: { nome: 'Beleza' }, nota_google: 4.8 })).toBe('Beleza · ★ 4,8')
    expect(metaNegocio({ id: '1', nome: 'x', categoria: { nome: 'Reparos' }, modalidades_atendimento: ['atende_domicilio'] })).toBe('Reparos · Vai até você')
  })

  it('prazo curto', () => {
    const agora = new Date('2026-10-21T10:00:00-03:00')
    expect(prazoCurto('2026-10-21T13:00:00-03:00', agora)).toBe('3h')
    expect(prazoCurto('2026-10-21T13:20:00-03:00', agora)).toBe('3h 20min')
    expect(prazoCurto('2026-10-21T23:00:00-03:00', agora)).toBe('hoje')
    expect(prazoCurto('2026-10-22T20:00:00-03:00', agora)).toBe('amanhã')
    expect(prazoCurto('2026-10-23T12:00:00-03:00', agora)).toBe('3 dias')
    expect(prazoCurto('2026-10-20T12:00:00-03:00', agora)).toBe('encerrada')
  })

  it('selo e preço', () => {
    const base = { id: '1', titulo: 't', desconto_texto: 'Leve 3 pague 2', expira_em: '', negocio: null }
    expect(seloOferta({ ...base, preco_original_centavos: 8000, preco_promocional_centavos: 6000 })).toEqual({ texto: '-25%', percentual: true })
    expect(seloOferta(base)).toEqual({ texto: 'Leve 3 pague 2', percentual: false })
    expect(precoCurto(8000)).toBe('R$ 80')
    expect(precoCurto(5990)).toMatch(/R\$\s59,90/)
  })
})
