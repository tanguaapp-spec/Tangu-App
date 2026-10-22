import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLARO, ESCURO, contraste, gerarCssTema, type Tema } from './paleta'

/**
 * Pares texto/fundo que o app realmente usa. AA = 4.5 (texto normal);
 * 3 para texto grande/ícones e placeholder.
 */
function pares(t: Tema): [string, string, string, number][] {
  const { casca, mata, barro, red, yellow } = t.escalas
  const k = t.tokens
  return [
    ['texto principal no fundo', barro[900], k.fundo, 4.5],
    ['texto principal no card', barro[900], k.superficie, 4.5],
    ['texto secundário (700) no card', barro[700], k.superficie, 4.5],
    ['texto apagado (600) no fundo', barro[600], k.fundo, 4.5],
    ['texto apagado (500) no card', barro[500], k.superficie, 4.5],
    ['texto apagado (500) no fundo', barro[500], k.fundo, 4.5],
    ['link laranja (600) no card', casca[600], k.superficie, 4.5],
    ['link laranja (700) no fundo', casca[700], k.fundo, 4.5],
    ['verde (600) no card', mata[600], k.superficie, 4.5],
    ['verde (700) no selo verde (100)', mata[700], mata[100], 4.5],
    ['laranja escuro (700) no selo laranja (100)', casca[700], casca[100], 4.5],
    ['laranja (800) no fundo de oferta (50)', casca[800], casca[50], 4.5],
    ['erro (600) no card', red[600], k.superficie, 4.5],
    ['erro (700) no alerta (50)', red[700], red[50], 4.5],
    ['aviso (800) no alerta amarelo (50)', yellow[800], yellow[50], 4.5],
    ['branco no botão verde', '#FFFFFF', k.serra, 4.5],
    ['branco no cabeçalho verde escuro', '#FFFFFF', k['serra-escuro'], 4.5],
    ['tinta no botão laranja', k.tinta, k.laranja, 4.5],
    ['tinta no laranja de hover', k.tinta, k['laranja-claro'], 4.5],
    ['placeholder (400) no card', barro[400], k.superficie, 3],
  ]
}

describe.each([
  ['claro', CLARO],
  ['escuro', ESCURO],
])('tema %s — contraste WCAG', (_nome, tema) => {
  it.each(pares(tema))('%s', (_rotulo, texto, fundo, minimo) => {
    expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(minimo)
  })
})

describe('app/tema.css', () => {
  it('está em dia com lib/tema/paleta.ts (rode `npm run tema` se falhar)', () => {
    const atual = readFileSync(path.resolve(__dirname, '..', '..', 'app', 'tema.css'), 'utf8')
    expect(atual.replace(/\r\n/g, '\n')).toBe(gerarCssTema())
  })
})
