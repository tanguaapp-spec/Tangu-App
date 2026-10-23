import { describe, expect, it } from 'vitest'
import { lerHorarioDia, resumoSemana, situacaoHorario } from './funcionamento'

// 2026-10-21 é quarta-feira; 15:00 em Brasília = 18:00 UTC
const quarta = (hora: string) => new Date(`2026-10-21T${hora}:00-03:00`)

describe('lerHorarioDia', () => {
  it('entende os formatos comuns', () => {
    expect(lerHorarioDia('08:00-18:00')).toEqual([[480, 1080]])
    expect(lerHorarioDia('8h às 18h')).toEqual([[480, 1080]])
    expect(lerHorarioDia('08-12 e 14-18')).toEqual([[480, 720], [840, 1080]])
    expect(lerHorarioDia('18:00-02:00')).toEqual([[1080, 1560]])
    expect(lerHorarioDia('Fechado')).toEqual([])
    expect(lerHorarioDia('24h')).toEqual([[0, 1440]])
  })
  it('texto ilegível ou vazio não vira chute', () => {
    expect(lerHorarioDia('depende do dia')).toBeNull()
    expect(lerHorarioDia('')).toBeNull()
  })
})

describe('situacaoHorario', () => {
  const h = { seg: '09:00-19:00', ter: '09:00-19:00', qua: '09:00-12:00, 14:00-19:00', qui: '09:00-19:00', sex: '09:00-19:00', sab: '08:00-14:00', dom: 'Fechado' }

  it('aberto mostra até quando', () => {
    expect(situacaoHorario(h, null, quarta('15:00'))).toEqual({ aberto: true, rotulo: 'Aberto até 19h' })
  })
  it('intervalo de almoço', () => {
    expect(situacaoHorario(h, null, quarta('13:00'))).toEqual({ aberto: false, rotulo: 'Fechado · abre às 14h' })
  })
  it('depois de fechar aponta o próximo dia', () => {
    expect(situacaoHorario(h, null, quarta('20:00'))).toEqual({ aberto: false, rotulo: 'Fechado · abre amanhã às 9h' })
  })
  it('turno que atravessa a meia-noite', () => {
    const bar = { ter: '18:00-02:00', qua: 'Fechado' }
    expect(situacaoHorario(bar, null, quarta('01:00'))).toEqual({ aberto: true, rotulo: 'Aberto até 2h' })
  })
  it('sem horário usa o botão manual, ou não diz nada', () => {
    expect(situacaoHorario(null, true)).toEqual({ aberto: true, rotulo: 'Aberto agora' })
    expect(situacaoHorario(null, null)).toEqual({ aberto: null, rotulo: null })
  })
  it('horário cadastrado tem prioridade sobre o botão manual', () => {
    expect(situacaoHorario(h, true, quarta('20:00')).aberto).toBe(false)
  })
})

describe('resumoSemana', () => {
  it('agrupa dias seguidos iguais', () => {
    expect(resumoSemana({ seg: '09:00-19:00', ter: '09:00-19:00', qua: '09:00-19:00', sab: '08:00-14:00', dom: 'Fechado' })).toEqual([
      { dias: 'Seg a qua', horas: '09:00–19:00', fechado: false },
      { dias: 'Sábado', horas: '08:00–14:00', fechado: false },
      { dias: 'Domingo', horas: 'Fechado', fechado: true },
    ])
  })
})
