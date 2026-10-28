import { describe, expect, it } from 'vitest'
import { horariosDoDia, mensagemAgendamento, mensagemPedido, totalPedido } from './whatsapp'

describe('pedido pelo WhatsApp', () => {
  const itens = [
    { nome: 'X-Tudo', quantidade: 2, precoCentavos: 2500 },
    { nome: 'Refrigerante', quantidade: 1, precoCentavos: 800 },
  ]
  it('soma itens e taxa só na entrega', () => {
    expect(totalPedido(itens, true, { taxa_entrega_centavos: 500 })).toMatchObject({ subtotal: 5800, taxa: 500, total: 6300 })
    expect(totalPedido(itens, false, { taxa_entrega_centavos: 500 }).total).toBe(5800)
  })
  it('mensagem tem itens, total, nome e endereço', () => {
    const m = mensagemPedido({ negocio: 'Lanche do Zé', itens, entrega: true, config: { taxa_entrega_centavos: 500 }, nome: 'Ana', endereco: 'Rua A, 10' })
    expect(m).toContain('2x X-Tudo')
    expect(m).toMatch(/Total: R\$\s?63,00/)
    expect(m).toContain('Entregar em: Rua A, 10')
  })
  it('item sem preço vira "a combinar"', () => {
    const m = mensagemPedido({ negocio: 'X', itens: [{ nome: 'Bolo', quantidade: 1, precoCentavos: null }], entrega: false, config: {}, nome: 'Ana' })
    expect(m).toContain('itens a combinar')
  })
})

describe('agendamento pelo WhatsApp', () => {
  const horario = { seg: '08:00-12:00, 14:00-18:00' }
  // domingo, 06/12/2026, 10h em Tanguá
  const agora = new Date('2026-12-06T13:00:00Z')
  it('serviço de 60 min cabe inteiro no turno, de 30 em 30', () => {
    const h = horariosDoDia(horario, '2026-12-07', 60, agora)
    expect(h[0]).toBe('08:00')
    expect(h).toContain('11:00')
    expect(h).not.toContain('11:30')
    expect(h).toContain('17:00')
    expect(h).not.toContain('12:00')
  })
  it('dia fechado ou passado não tem horário', () => {
    expect(horariosDoDia(horario, '2026-12-06', 30, agora)).toEqual([])
    expect(horariosDoDia(horario, '2026-12-01', 30, agora)).toEqual([])
  })
  it('mensagem com serviço, dia e hora', () => {
    expect(mensagemAgendamento({ negocio: 'Barbearia', servico: 'Corte', data: '2026-12-07', hora: '09:00', nome: 'João' })).toMatch(/segunda-feira.*\n.*09:00/)
  })
})
