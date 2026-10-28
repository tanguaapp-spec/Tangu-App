import { describe, expect, it } from 'vitest'
import { bairroCanonico, converterHorarios, enderecoCurto, lerArquivoLista, limparTelefone, mapearCategoria } from './listas'

describe('importação de comércios', () => {
  it('categoria do Google vira categoria do Tanguá', () => {
    expect(mapearCategoria('Pizzaria')).toEqual({ tipo: 'negocio', categoriaSlug: 'alimentacao' })
    expect(mapearCategoria('Salão de beleza')).toEqual({ tipo: 'negocio', categoriaSlug: 'beleza-estetica' })
    expect(mapearCategoria('Posto de combustível, Restaurante')).toEqual({ tipo: 'negocio', categoriaSlug: 'automotivo' })
    expect(mapearCategoria('Igreja')).toMatchObject({ tipo: 'ignorar' })
    expect(mapearCategoria('Organização não governamental', 'Secretaria Municipal de Saúde')).toEqual({ tipo: 'servico_util' })
    expect(mapearCategoria('Escritório da empresa')).toEqual({ tipo: 'negocio', categoriaSlug: 'outros' })
  })

  it('horários no formato do app', () => {
    expect(converterHorarios('segunda-feira: 8:00–12:00, 13:00–18:00 | domingo: Fechado | sábado: Atendimento 24 horas')).toEqual({
      seg: '08:00-12:00, 13:00-18:00',
      dom: 'Fechado',
      sab: '24h',
    })
    expect(converterHorarios('')).toBeNull()
  })

  it('telefone: celular vira também WhatsApp; fixo não', () => {
    expect(limparTelefone('+55 (21) 99876-5432')).toEqual({ telefone: '21998765432', whatsapp: '21998765432' })
    expect(limparTelefone('(21) 2747-1234')).toEqual({ telefone: '2127471234', whatsapp: null })
    expect(limparTelefone('123')).toEqual({ telefone: null, whatsapp: null })
  })

  it('bairro e endereço', () => {
    expect(bairroCanonico('Cidade Satelite')).toBe('Cidade Satélite')
    expect(bairroCanonico('Tanguá')).toBeNull()
    expect(enderecoCurto('R. Dr. Luiz, 120 - Centro, Tanguá - RJ, 24890-000')).toBe('R. Dr. Luiz, 120')
  })

  it('lê CSV com ponto e vírgula e aspas', () => {
    const csv = 'nome;categoria;telefone;lat\n"Bar do Zé; Petiscos";Bar;(21) 99999-0000;-22.73\nX;;;\n'
    const [a, ...resto] = lerArquivoLista(csv)
    expect(a).toMatchObject({ nome: 'Bar do Zé; Petiscos', categoria: 'Bar', lat: -22.73 })
    expect(resto).toHaveLength(0)
  })

  it('lê JSON do BoraAli', () => {
    const json = JSON.stringify([{ nome: 'Padaria Sol', categoria: 'Padaria', place_id: 'abc', lat: '-22.7', lng: -42.7 }])
    expect(lerArquivoLista(json)[0]).toMatchObject({ nome: 'Padaria Sol', place_id: 'abc', lat: -22.7, lng: -42.7 })
  })
})
