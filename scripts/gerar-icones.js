// Gera os ícones PWA/favicon a partir da marca (components/marca/logo-tangua.tsx).
// Roda manualmente quando a logo mudar: `node scripts/gerar-icones.js`
const fs = require('fs')
const sharp = require('sharp')
const path = require('path')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')
const VERDE = '#0E4D3A'

// mesmo desenho de LogoTangua (caixa 64x64)
function simbolo({ alfinete, folha }) {
  return `
    <path d="M32 4C18 4 8 14.5 8 28c0 17 24 32 24 32s24-15 24-32C56 14.5 46 4 32 4z" fill="${alfinete}"/>
    <circle cx="32" cy="27" r="15" fill="#F26A1B"/>
    <g stroke="#FFE7D6" stroke-width="2.2" stroke-linecap="round">
      <path d="M32 27V13"/><path d="M32 27l12.1-7"/><path d="M32 27l12.1 7"/>
      <path d="M32 27v14"/><path d="M32 27l-12.1 7"/><path d="M32 27l-12.1-7"/>
    </g>
    <circle cx="32" cy="27" r="3" fill="#FFE7D6"/>
    <path d="M41 8c5-4.5 11-4 14-2-2.5 5.5-8.5 7.5-14 2z" fill="${folha}"/>`
}

// ícone de app: quadrado verde (cantos opcionais) com o alfinete branco no meio
function svgApp({ tamanho, fator, raio = 0 }) {
  return `<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="${raio}" fill="${VERDE}"/>
  <g transform="translate(32,32) scale(${fator}) translate(-32,-32)">${simbolo({ alfinete: '#FFFFFF', folha: '#7FD3A1' })}</g>
</svg>`
}

// favicon: só o alfinete verde, fundo transparente (lê bem em aba clara e escura)
const svgFavicon = `<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">${simbolo({ alfinete: VERDE, folha: '#3FA36B' })}</svg>`

async function png(svg, tamanho, arquivo) {
  await sharp(Buffer.from(svg)).resize(tamanho, tamanho).png().toFile(path.join(PUBLIC_DIR, arquivo))
}

async function gerar() {
  await png(svgApp({ tamanho: 192, fator: 0.72, raio: 14 }), 192, 'icon-192.png')
  await png(svgApp({ tamanho: 512, fator: 0.72, raio: 14 }), 512, 'icon-512.png')
  // maskable: sangra até a borda; símbolo dentro da "safe zone" (~60% central)
  await png(svgApp({ tamanho: 512, fator: 0.58 }), 512, 'icon-512-maskable.png')
  // iOS aplica os cantos sozinho: quadrado cheio
  await png(svgApp({ tamanho: 180, fator: 0.68 }), 180, 'apple-touch-icon.png')
  await png(svgFavicon, 48, 'favicon.png')
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), svgFavicon)
  console.log('Ícones gerados em public/: icon-192, icon-512, icon-512-maskable, apple-touch-icon, favicon.png, favicon.svg')
}

gerar().catch((err) => {
  console.error(err)
  process.exit(1)
})
