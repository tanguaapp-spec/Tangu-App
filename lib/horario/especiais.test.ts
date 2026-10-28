import { describe, expect, it } from 'vitest'
import { aplicarEspeciais, situacaoHorario } from './funcionamento'

// quarta-feira, 25/12/2030, 10h em Tanguá
const natal = new Date('2030-12-25T13:00:00Z')
const semana = { seg: '08:00-18:00', ter: '08:00-18:00', qua: '08:00-18:00', qui: '08:00-18:00', sex: '08:00-18:00' }

describe('horários especiais', () => {
  it('feriado fecha o dia e o selo mostra fechado', () => {
    const { horario, aviso } = aplicarEspeciais(semana, [{ data: '2030-12-25', fechado: true, abre: null, fecha: null, motivo: 'Natal' }], natal)
    expect(situacaoHorario(semana, null, natal).aberto).toBe(true)
    expect(situacaoHorario(horario, null, natal)).toEqual({ aberto: false, rotulo: 'Fechado · abre amanhã às 8h' })
    expect(aviso).toBe('Hoje: fechado (Natal)')
  })

  it('horário reduzido vale só naquele dia', () => {
    const { horario, aviso } = aplicarEspeciais(semana, [{ data: '2030-12-26', fechado: false, abre: '09:00:00', fecha: '12:00:00', motivo: null }], natal)
    expect(horario?.qui).toBe('09:00-12:00')
    expect(horario?.sex).toBe('08:00-18:00')
    expect(aviso).toBe('Amanhã: horário especial, 09:00 às 12:00')
  })

  it('data fora da próxima semana não muda nada', () => {
    const { horario } = aplicarEspeciais(semana, [{ data: '2031-01-20', fechado: true, abre: null, fecha: null, motivo: null }], natal)
    expect(horario).toEqual(semana)
  })
})
