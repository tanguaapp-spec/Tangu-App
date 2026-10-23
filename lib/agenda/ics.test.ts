import { describe, expect, it } from 'vitest'
import { gerarIcs, linkGoogleAgenda } from './ics'

describe('ics', () => {
  it('gera evento com início, fim de 2h e texto escapado', () => {
    const ics = gerarIcs({ id: 'a1', titulo: 'Festa, da Laranja; 2026', local: 'Praça', inicio: '2026-11-01T22:00:00Z', url: 'https://x/agenda' })
    expect(ics).toContain('DTSTART:20261101T220000Z')
    expect(ics).toContain('DTEND:20261102T000000Z')
    expect(ics).toContain('SUMMARY:Festa\\, da Laranja\\; 2026')
    expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
  })

  it('link do Google Agenda', () => {
    expect(linkGoogleAgenda({ titulo: 'Feira', inicio: '2026-11-01T22:00:00Z' })).toContain('dates=20261101T220000Z%2F20261102T000000Z')
  })
})
