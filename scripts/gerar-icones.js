// Gera os ícones PWA/favicon a partir da nova marca (components/marca/logo-tangua.tsx).
// Roda uma vez, manualmente, quando a logo mudar: `node scripts/gerar-icones.js`
const sharp = require('sharp')
const path = require('path')

const PUBLIC_DIR = path.join(__dirname, '..', 'public')

// desenho original vive numa caixa 64x64, centro aproximado do conjunto (32, 34)
const CONTEUDO = `
  <circle cx="32" cy="37" r="23" fill="#EF7A1A" />
  <ellipse cx="23.5" cy="27.5" rx="6.5" ry="4.5" fill="#FFEAD2" opacity="0.5" />
  <path d="M32 15 C 23 10, 12 16, 16 27 C 20 34, 30 30, 32 15 Z" fill="#4F7A3D" />
`
const CENTRO_CONTEUDO = { x: 32, y: 34 }

function svgLaranja({ tamanho, fundo = null, fator = 1 }) {
  const { x: cx, y: cy } = CENTRO_CONTEUDO
  return `
<svg width="${tamanho}" height="${tamanho}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  ${fundo ? `<rect width="64" height="64" fill="${fundo}"/>` : ''}
  <g transform="translate(32,32) scale(${fator}) translate(${-cx},${-cy})">
    ${CONTEUDO}
  </g>
</svg>`
}

async function gerar() {
  await sharp(Buffer.from(svgLaranja({ tamanho: 192, fator: 1 })))
    .resize(192, 192)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-192.png'))

  await sharp(Buffer.from(svgLaranja({ tamanho: 512, fator: 1 })))
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-512.png'))

  // maskable: fundo sólido + logo encolhida pra caber na "safe zone" (~66% central)
  await sharp(Buffer.from(svgLaranja({ tamanho: 512, fator: 0.62, fundo: '#FBF4E9' })))
    .resize(512, 512)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'icon-512-maskable.png'))

  await sharp(Buffer.from(svgLaranja({ tamanho: 48, fator: 1 })))
    .resize(48, 48)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'))

  console.log('Ícones gerados em public/: icon-192.png, icon-512.png, icon-512-maskable.png, favicon.png')
}

gerar().catch((err) => {
  console.error(err)
  process.exit(1)
})
