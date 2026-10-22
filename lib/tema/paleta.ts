/**
 * Identidade "Tanguá" (out/2026) — fonte única das cores dos dois temas.
 *
 * `npm run tema` gera app/tema.css a partir daqui; o teste paleta.test.ts
 * confere que o CSS está em dia e que os pares de texto/fundo usados no app
 * passam no contraste WCAG AA nos dois temas.
 *
 * Escalas (casca, mata, barro, red, yellow) INVERTEM no escuro: o tom 50 é
 * sempre "fundo tingido" e o 900 é sempre "texto forte". Tokens de marca
 * (serra, laranja, tinta) quase não mudam: são cor sólida com texto fixo.
 */
export type Tom = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type Escala = Record<Tom, string>
export type Tema = {
  escalas: Record<'casca' | 'mata' | 'barro' | 'red' | 'yellow', Escala>
  tokens: Record<'serra' | 'serra-escuro' | 'laranja' | 'laranja-claro' | 'tinta' | 'superficie' | 'fundo' | 'sombra', string>
}

export const CLARO: Tema = {
  escalas: {
    casca: { 50: '#FFF4EC', 100: '#FFE7D6', 200: '#FFCBA6', 300: '#FCA56B', 400: '#F7843D', 500: '#F26A1B', 600: '#C24E0C', 700: '#A84209', 800: '#8A3508', 900: '#5C2406' },
    mata: { 50: '#EEF6F1', 100: '#E3F0E8', 200: '#C2DFCC', 300: '#8FC3A3', 400: '#4F9A73', 500: '#1F7A55', 600: '#156548', 700: '#0E4D3A', 800: '#0B3D2E', 900: '#0A2E24' },
    barro: { 50: '#F1F4F0', 100: '#E4EAE5', 200: '#CDD7D0', 300: '#B0BEB5', 400: '#7C8D84', 500: '#5E6F66', 600: '#4F5F57', 700: '#3B4A43', 800: '#26352E', 900: '#13241D' },
    red: { 50: '#FEF2F2', 100: '#FEE2E2', 200: '#FECACA', 300: '#FCA5A5', 400: '#F87171', 500: '#EF4444', 600: '#C8352B', 700: '#B42318', 800: '#912018', 900: '#7A1B14' },
    yellow: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#F5B82E', 500: '#E0A00F', 600: '#B45309', 700: '#92400E', 800: '#78350F', 900: '#5A2A0B' },
  },
  tokens: {
    serra: '#0E4D3A',
    'serra-escuro': '#0A2E24',
    laranja: '#F26A1B',
    'laranja-claro': '#F7843D',
    tinta: '#13241D',
    superficie: '#FFFFFF',
    fundo: '#F4F6F1',
    sombra: '#13241D',
  },
}

export const ESCURO: Tema = {
  escalas: {
    casca: { 50: '#2A1A10', 100: '#3A2214', 200: '#5A3218', 300: '#85461C', 400: '#C25A1A', 500: '#F26A1B', 600: '#F7894A', 700: '#FAA470', 800: '#FCC39C', 900: '#FEE3D0' },
    mata: { 50: '#10241B', 100: '#143127', 200: '#1B4535', 300: '#275D48', 400: '#3B7D61', 500: '#56A07F', 600: '#79BC9C', 700: '#9DD3B8', 800: '#C1E5D2', 900: '#E2F4EA' },
    barro: { 50: '#1A2621', 100: '#22312A', 200: '#2E3F37', 300: '#405249', 400: '#6B7D74', 500: '#9AAAA1', 600: '#B3C0B9', 700: '#C9D4CD', 800: '#DEE6E1', 900: '#EEF3F0' },
    red: { 50: '#2C1414', 100: '#3D1A1A', 200: '#5C2424', 300: '#8A3030', 400: '#C24141', 500: '#E55A5A', 600: '#F38B8B', 700: '#F7A8A8', 800: '#FBC9C9', 900: '#FDE4E4' },
    yellow: { 50: '#2A2210', 100: '#3A2E12', 200: '#574416', 300: '#7D611C', 400: '#C2932A', 500: '#E3B341', 600: '#F0C766', 700: '#F5D68C', 800: '#F9E5B3', 900: '#FCF2D9' },
  },
  tokens: {
    serra: '#136B50',
    'serra-escuro': '#0B2A20',
    laranja: '#F26A1B',
    'laranja-claro': '#F7843D',
    tinta: '#13241D',
    superficie: '#17241E',
    fundo: '#0E1814',
    sombra: '#000000',
  },
}

function canais(hex: string) {
  const n = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)).join(' ')
}

function bloco(tema: Tema) {
  const linhas: string[] = []
  for (const [nome, escala] of Object.entries(tema.escalas)) {
    for (const [tom, hex] of Object.entries(escala)) linhas.push(`  --${nome}-${tom}: ${canais(hex)};`)
  }
  for (const [nome, hex] of Object.entries(tema.tokens)) linhas.push(`  --${nome}: ${canais(hex)};`)
  return linhas.join('\n')
}

/** Conteúdo de app/tema.css. Escuro vale com html.dark (escolhido ou pelo sistema). */
export function gerarCssTema() {
  return [
    '/* GERADO por `npm run tema` a partir de lib/tema/paleta.ts — não edite à mão. */',
    ':root {',
    '  color-scheme: light;',
    bloco(CLARO),
    '}',
    '',
    'html.dark {',
    '  color-scheme: dark;',
    bloco(ESCURO),
    '}',
    '',
  ].join('\n')
}

// --- contraste WCAG ---------------------------------------------------
function luminancia(hex: string) {
  const [r, g, b] = canais(hex)
    .split(' ')
    .map((v) => {
      const c = Number(v) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contraste(a: string, b: string) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}
