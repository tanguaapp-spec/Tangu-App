import { describe, expect, it } from 'vitest'
import { comOrigemPush, horarioSilencioso } from './notificar'

describe('notificar', () => {
  it('horário silencioso é de 22h às 8h de Brasília', () => {
    expect(horarioSilencioso(new Date('2026-10-21T23:30:00-03:00'))).toBe(true)
    expect(horarioSilencioso(new Date('2026-10-21T07:59:00-03:00'))).toBe(true)
    expect(horarioSilencioso(new Date('2026-10-21T08:00:00-03:00'))).toBe(false)
    expect(horarioSilencioso(new Date('2026-10-21T21:59:00-03:00'))).toBe(false)
  })
  it('marca origem=push só em links de perfil', () => {
    expect(comOrigemPush('/negocio/salao#oferta')).toBe('/negocio/salao?origem=push#oferta')
    expect(comOrigemPush('/negocio/salao?x=1')).toBe('/negocio/salao?x=1&origem=push')
    expect(comOrigemPush('/agenda')).toBe('/agenda')
  })
})
