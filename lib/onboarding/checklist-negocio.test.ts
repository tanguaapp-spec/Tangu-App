import { describe, expect, it } from 'vitest'
import { montarChecklistNegocio, progressoChecklist, type DadosChecklistNegocio } from './checklist-negocio'

const vazio: DadosChecklistNegocio = {
  tipo_perfil: 'estabelecimento',
  descricao: null,
  categoria_id: null,
  whatsapp: null,
  bairro: null,
  endereco: null,
  area_atendimento: null,
  horario_funcionamento: null,
  foto_capa_url: null,
  galeria: [],
  total_produtos: 0,
  total_posts: 0,
  total_cupons: 0,
}

describe('checklist do negócio', () => {
  it('perfil vazio: 0% e próximo passo é o WhatsApp', () => {
    const p = progressoChecklist(montarChecklistNegocio(vazio))
    expect(p.percentual).toBe(0)
    expect(p.proximo?.id).toBe('whatsapp')
  })

  it('perfil completo: 100% e sem próximo passo', () => {
    const p = progressoChecklist(
      montarChecklistNegocio({
        ...vazio,
        descricao: 'Padaria artesanal com pão quente o dia inteiro no centro.',
        categoria_id: 'c',
        whatsapp: '(21) 97265-2314',
        bairro: 'Centro',
        endereco: 'Rua A, 1',
        horario_funcionamento: { seg: '08-18' },
        foto_capa_url: 'x',
        galeria: ['a', 'b'],
        total_produtos: 1,
        total_posts: 1,
        total_cupons: 1,
      })
    )
    expect(p.percentual).toBe(100)
    expect(p.proximo).toBeNull()
  })

  it('autônomo não precisa de endereço — basta a área de atendimento', () => {
    const itens = montarChecklistNegocio({ ...vazio, tipo_perfil: 'autonomo', area_atendimento: 'Centro e Duques' })
    expect(itens.find((i) => i.id === 'endereco')).toBeUndefined()
    expect(itens.find((i) => i.id === 'area')?.feito).toBe(true)
  })

  it('WhatsApp curto demais não conta como feito', () => {
    expect(montarChecklistNegocio({ ...vazio, whatsapp: '123' }).find((i) => i.id === 'whatsapp')?.feito).toBe(false)
  })

  it('descrição de 1 palavra não conta', () => {
    expect(montarChecklistNegocio({ ...vazio, descricao: 'pão' }).find((i) => i.id === 'descricao')?.feito).toBe(false)
  })
})
