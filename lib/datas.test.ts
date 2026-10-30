import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dataCurta, dataHora, dataPorExtenso, diaISO, hora, inicioDoMes } from './datas'

// 19:27 em UTC = 16:27 em Tanguá (o caso real da notificação)
const instante = '2026-10-29T19:27:30Z'

describe('datas no horário de Tanguá', () => {
  it('mostra a hora de Brasília, não a do servidor', () => {
    expect(hora(instante)).toBe('16:27')
    expect(dataHora(instante)).toMatch(/^29\/10\/2026,? 16:27$/)
    expect(dataCurta(instante)).toBe('29/10/2026')
    expect(dataPorExtenso(instante)).toBe('29 de outubro, 16:27')
    expect(dataPorExtenso(instante, false)).toBe('29 de outubro')
  })

  it('vazio vira traço', () => {
    expect(dataHora(null)).toBe('—')
    expect(dataCurta(undefined, '')).toBe('')
  })

  it('o dia vira à meia-noite daqui, não às 21h', () => {
    expect(diaISO(new Date('2026-10-30T01:30:00Z'))).toBe('2026-10-29') // 22h30 do dia 29 aqui
    expect(diaISO(new Date('2026-10-30T03:00:00Z'))).toBe('2026-10-30')
  })

  it('início do mês é meia-noite do dia 1º daqui', () => {
    expect(inicioDoMes(new Date('2026-11-01T01:00:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z') // ainda 31/10 aqui
    expect(inicioDoMes(new Date('2026-11-01T04:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })
})

describe('nenhuma tela formata data sem o fuso', () => {
  function arquivos(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name)
      if (d.isDirectory()) return arquivos(p)
      return /\.tsx?$/.test(d.name) && !d.name.endsWith('.test.ts') ? [p] : []
    })
  }
  const fontes = ['app', 'components', 'lib'].flatMap((d) => arquivos(path.join(process.cwd(), d)))

  it('sem toLocaleString/DateString/TimeString de data sem timeZone', () => {
    const problemas: string[] = []
    for (const f of fontes) {
      fs.readFileSync(f, 'utf8')
        .split('\n')
        .forEach((linha, i) => {
          const data = /new Date\([^)]*\)\.toLocaleString\(|toLocaleDateString\(|toLocaleTimeString\(/.test(linha)
          if (data && !linha.includes('timeZone')) problemas.push(`${path.relative(process.cwd(), f)}:${i + 1}`)
        })
    }
    expect(problemas, 'use dataHora/dataCurta de @/lib/datas').toEqual([])
  })

  it('sem format() do date-fns (formata no fuso do servidor)', () => {
    const usam = fontes.filter((f) => /import \{[^}]*\bformat\b[^}]*\} from 'date-fns'/.test(fs.readFileSync(f, 'utf8')))
    expect(usam.map((f) => path.relative(process.cwd(), f))).toEqual([])
  })
})
