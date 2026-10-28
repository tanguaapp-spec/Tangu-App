// Gera a pasta kit-instagram/marca: logos, foto de perfil e capas de destaque.
// Uso: node scripts/kit-instagram/marca.mjs
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Compass, FileText, HelpCircle, Store, Tag, CalendarDays, Sparkles } from 'lucide-react'

const SAIDA = path.resolve('kit-instagram/marca')
fs.mkdirSync(SAIDA, { recursive: true })

const COR = { serra: '#0E4D3A', serraEscuro: '#0A2E24', laranja: '#F26A1B', pessego: '#FFE7D6', folha: '#3FA36B', folhaClara: '#7FD3A1', tinta: '#13241D', fundo: '#F4F6F1', branco: '#FFFFFF' }

// mesmo desenho de components/marca/logo-tangua.tsx
const simbolo = (alfinete, folha) => `
  <path d="M32 4C18 4 8 14.5 8 28c0 17 24 32 24 32s24-15 24-32C56 14.5 46 4 32 4z" fill="${alfinete}"/>
  <circle cx="32" cy="27" r="15" fill="${COR.laranja}"/>
  <g stroke="${COR.pessego}" stroke-width="2.2" stroke-linecap="round">
    <path d="M32 27V13"/><path d="M32 27l12.1-7"/><path d="M32 27l12.1 7"/>
    <path d="M32 27v14"/><path d="M32 27l-12.1 7"/><path d="M32 27l-12.1-7"/>
  </g>
  <circle cx="32" cy="27" r="3" fill="${COR.pessego}"/>
  <path d="M41 8c5-4.5 11-4 14-2-2.5 5.5-8.5 7.5-14 2z" fill="${folha}"/>`

const svgSimbolo = (alfinete, folha) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${simbolo(alfinete, folha)}</svg>`

// fonte da palavra "tanguá": Familjen Grotesk (Google Fonts). No SVG vai como
// texto com fallback; nos PNG a gente desenha com a fonte do sistema se a
// oficial não estiver instalada — por isso existe também o PNG pronto.
const svgHorizontal = (corTexto, alfinete, folha, fundo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 100" width="1440" height="400">
  ${fundo ? `<rect width="360" height="100" rx="0" fill="${fundo}"/>` : ''}
  <g transform="translate(14 14) scale(1.13)">${simbolo(alfinete, folha)}</g>
  <text x="100" y="68" font-family="'Familjen Grotesk', 'Arial Rounded MT Bold', Arial, sans-serif" font-weight="700" font-size="58" letter-spacing="-1.2" fill="${corTexto}">tanguá</text>
</svg>`

async function salvar(nome, svg, largura) {
  fs.writeFileSync(path.join(SAIDA, `${nome}.svg`), svg)
  await sharp(Buffer.from(svg), { density: 600 }).resize({ width: largura }).png().toFile(path.join(SAIDA, `${nome}.png`))
}

await salvar('simbolo-cor', svgSimbolo(COR.serra, COR.folha), 1024)
await salvar('simbolo-branco', svgSimbolo(COR.branco, COR.folhaClara), 1024)
await salvar('logo-horizontal-cor-fundo-transparente', svgHorizontal(COR.serra, COR.serra, COR.folha), 1440)
await salvar('logo-horizontal-branco-fundo-transparente', svgHorizontal(COR.branco, COR.branco, COR.folhaClara), 1440)
await salvar('logo-horizontal-fundo-claro', svgHorizontal(COR.serra, COR.serra, COR.folha, COR.fundo), 1440)
await salvar('logo-horizontal-fundo-verde', svgHorizontal(COR.branco, COR.branco, COR.folhaClara, COR.serra), 1440)

// foto de perfil do Instagram (1080x1080; o Instagram corta em círculo — margem segura)
const perfil = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${COR.serra}"/>
  <g transform="translate(250 230) scale(9)">${simbolo(COR.branco, COR.folhaClara)}</g>
</svg>`
await sharp(Buffer.from(perfil)).png().toFile(path.join(SAIDA, 'foto-perfil-instagram-1080.png'))
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080"><rect width="1080" height="1080" fill="${COR.fundo}"/><g transform="translate(250 230) scale(9)">${simbolo(COR.serra, COR.folha)}</g></svg>`))
  .png()
  .toFile(path.join(SAIDA, 'foto-perfil-instagram-1080-fundo-claro.png'))

// capas dos destaques (Stories): ícone branco no centro, fundo da marca
const DESTAQUES = [
  ['ofertas', Tag, COR.laranja, COR.tinta],
  ['explorar', Compass, COR.serra, COR.branco],
  ['agenda', CalendarDays, COR.serra, COR.branco],
  ['orcamentos', FileText, COR.serra, COR.branco],
  ['para-negocios', Store, COR.laranja, COR.tinta],
  ['novidades', Sparkles, COR.serra, COR.branco],
  ['duvidas', HelpCircle, COR.serra, COR.branco],
]
const pastaDestaques = path.join(SAIDA, 'capas-destaques-stories')
fs.mkdirSync(pastaDestaques, { recursive: true })
for (const [nome, Icone, fundo, cor] of DESTAQUES) {
  const icone = renderToStaticMarkup(createElement(Icone, { size: 420, color: cor, strokeWidth: 1.6 }))
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="${fundo}"/>
    <g transform="translate(330 750)">${icone.replace('<svg', '<svg x="0" y="0"')}</g>
  </svg>`
  await sharp(Buffer.from(svg)).png().toFile(path.join(pastaDestaques, `destaque-${nome}.png`))
}

console.log('marca gerada em', SAIDA)
