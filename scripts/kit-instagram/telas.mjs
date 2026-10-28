// Gera kit-instagram/marca (logos com a fonte oficial) e kit-instagram/telas (prints e mockups).
// Uso: node scripts/kit-instagram/telas.mjs <arquivo-senhas-demo.json>
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://tangua-app.vercel.app'
const KIT = path.resolve('kit-instagram')
const senhas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'))
const fonte = (n) => `data:font/woff2;base64,${fs.readFileSync(path.join(KIT, 'fontes', n)).toString('base64')}`
const SIMBOLO = (alfinete, folha) => `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><path d="M32 4C18 4 8 14.5 8 28c0 17 24 32 24 32s24-15 24-32C56 14.5 46 4 32 4z" fill="${alfinete}"/><circle cx="32" cy="27" r="15" fill="#F26A1B"/><g stroke="#FFE7D6" stroke-width="2.2" stroke-linecap="round"><path d="M32 27V13"/><path d="M32 27l12.1-7"/><path d="M32 27l12.1 7"/><path d="M32 27v14"/><path d="M32 27l-12.1 7"/><path d="M32 27l-12.1-7"/></g><circle cx="32" cy="27" r="3" fill="#FFE7D6"/><path d="M41 8c5-4.5 11-4 14-2-2.5 5.5-8.5 7.5-14 2z" fill="${folha}"/></svg>`
const CSS_FONTES = `
  @font-face { font-family: 'Familjen Grotesk'; src: url(${fonte('FamiljenGrotesk-latin.woff2')}) format('woff2'); font-weight: 400 700; }
  @font-face { font-family: 'Figtree'; src: url(${fonte('Figtree-latin.woff2')}) format('woff2'); font-weight: 300 900; }
  body { margin: 0; }`

const nav = await chromium.launch()

// ---------------------------------------------------------------- logos
async function logos() {
  const p = await nav.newPage({ deviceScaleFactor: 4 })
  const pasta = path.join(KIT, 'marca')
  const variantes = [
    ['logo-horizontal-cor', 'transparent', '#0E4D3A', '#0E4D3A', '#3FA36B', '#3B4A43'],
    ['logo-horizontal-branco', 'transparent', '#FFFFFF', '#FFFFFF', '#7FD3A1', '#E3F0E8'],
    ['logo-horizontal-fundo-claro', '#F4F6F1', '#0E4D3A', '#0E4D3A', '#3FA36B', '#3B4A43'],
    ['logo-horizontal-fundo-verde', '#0E4D3A', '#FFFFFF', '#FFFFFF', '#7FD3A1', '#E3F0E8'],
    ['logo-horizontal-fundo-laranja', '#F26A1B', '#13241D', '#0E4D3A', '#3FA36B', '#13241D'],
  ]
  for (const [nome, fundo, texto, alfinete, folha, slogan] of variantes) {
    for (const comSlogan of [false, true]) {
      await p.setContent(`<style>${CSS_FONTES} html,body{background:transparent}</style>
        <div id="l" style="display:inline-flex;flex-direction:column;align-items:flex-start;gap:10px;padding:28px 36px;background:${fundo}">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:84px;height:84px">${SIMBOLO(alfinete, folha)}</div>
            <span style="font-family:'Familjen Grotesk';font-weight:700;font-size:76px;letter-spacing:-0.02em;color:${texto};line-height:1">tanguá</span>
          </div>
          ${comSlogan ? `<span style="font-family:'Figtree';font-weight:600;font-size:24px;color:${slogan};padding-left:4px">Tudo de Tanguá, perto de você.</span>` : ''}
        </div>`)
      await p.evaluate(() => document.fonts.ready)
      await p.locator('#l').screenshot({ path: path.join(pasta, `${nome}${comSlogan ? '-com-slogan' : ''}.png`), omitBackground: fundo === 'transparent' })
    }
  }
  // vertical (símbolo em cima) — bom pra post quadrado e capa de reels
  for (const [nome, fundo, texto, alfinete, folha] of [
    ['logo-vertical-fundo-verde', '#0E4D3A', '#FFFFFF', '#FFFFFF', '#7FD3A1'],
    ['logo-vertical-fundo-claro', '#F4F6F1', '#0E4D3A', '#0E4D3A', '#3FA36B'],
  ]) {
    await p.setViewportSize({ width: 1080, height: 1080 })
    await p.setContent(`<style>${CSS_FONTES}</style>
      <div style="width:1080px;height:1080px;background:${fundo};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px">
        <div style="width:360px;height:360px">${SIMBOLO(alfinete, folha)}</div>
        <span style="font-family:'Familjen Grotesk';font-weight:700;font-size:150px;letter-spacing:-0.02em;color:${texto};line-height:1">tanguá</span>
        <span style="font-family:'Figtree';font-weight:600;font-size:42px;color:${texto};opacity:.8">Tudo de Tanguá, perto de você.</span>
      </div>`)
    await p.evaluate(() => document.fonts.ready)
    await p.screenshot({ path: path.join(pasta, `${nome}-1080.png`), clip: { x: 0, y: 0, width: 1080, height: 1080 } })
  }
  // remove os PNG/SVG provisórios com fonte genérica
  for (const f of fs.readdirSync(pasta)) if (/fundo-transparente\.(png|svg)$/.test(f) || /^logo-horizontal-fundo-(claro|verde)\.svg$/.test(f)) fs.rmSync(path.join(pasta, f))
  await p.close()
  console.log('logos ok')
}

// ---------------------------------------------------------------- prints do app
async function contexto({ tema = 'claro', desktop = false, login } = {}) {
  const ctx = await nav.newContext(
    desktop ? { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: tema === 'escuro' ? 'dark' : 'light' } : { ...devices['iPhone 13'], colorScheme: tema === 'escuro' ? 'dark' : 'light' }
  )
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('tangua-tema', t)
      localStorage.setItem('tangua-convite-adiado-ate', '9999999999999')
    } catch {}
  }, tema)
  const p = await ctx.newPage()
  if (login) {
    await p.goto(`${BASE}/entrar`)
    await p.fill('#email', login)
    await p.fill('#senha', senhas[login])
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 30000 }), p.click('form button[type=submit]')])
  }
  return { ctx, p }
}

async function tirar(p, rota, nome, pasta, { inteira = false } = {}) {
  await p.goto(BASE + rota, { waitUntil: 'networkidle' })
  await p.waitForTimeout(1800) // tela de abertura some
  fs.mkdirSync(pasta, { recursive: true })
  const arquivo = path.join(pasta, `${nome}.png`)
  await p.screenshot({ path: arquivo, fullPage: inteira })
  return arquivo
}

const telas = path.join(KIT, 'telas')
const celular = []

async function prints() {
  const estado = JSON.parse(fs.readFileSync(path.join(path.dirname(process.argv[2]), 'estado.json'), 'utf8'))
  {
    const { ctx, p } = await contexto()
    for (const [rota, nome] of [
      ['/', '01-inicio'],
      ['/buscar', '02-explorar'],
      ['/buscar?q=sal%C3%A3o&oferta=1', '03-explorar-filtro-com-oferta'],
      ['/negocio/salao-da-ana', '04-perfil-negocio-salao'],
      ['/negocio/ze-eletricista', '05-perfil-profissional-autonomo'],
      ['/negocio/padaria-central', '06-perfil-padaria'],
      ['/ofertas', '07-ofertas'],
      ['/agenda', '08-agenda'],
      ['/orcamentos', '09-orcamentos-como-funciona'],
      ['/categoria/beleza-estetica', '10-categoria'],
    ])
      celular.push(await tirar(p, rota, nome, path.join(telas, 'celular-claro')))
    await tirar(p, '/negocio/salao-da-ana', '04b-perfil-negocio-salao-completo', path.join(telas, 'celular-claro'), { inteira: true })
    await ctx.close()
  }
  {
    const { ctx, p } = await contexto({ login: 'maria@tangua-teste.app' })
    for (const [rota, nome] of [
      ['/', '11-inicio-logada'],
      ['/negocio/salao-da-ana#oferta', '12-cupom-com-codigo-e-qr'],
      ['/perfil', '13-voce'],
      ['/favoritos', '14-favoritos'],
      [`/orcamentos/${estado.pedidoMaria}`, '15-orcamento-respondido'],
      ['/notificacoes', '16-notificacoes'],
    ])
      celular.push(await tirar(p, rota, nome, path.join(telas, 'celular-claro')))
    await tirar(p, '/perfil', '13b-voce-completo-com-qr-indicacao', path.join(telas, 'celular-claro'), { inteira: true })
    await ctx.close()
  }
  {
    const { ctx, p } = await contexto({ login: 'ana@tangua-teste.app' })
    for (const [rota, nome] of [
      ['/painel/negocio', '20-painel-lojista'],
      ['/painel/negocio/catalogo', '21-painel-catalogo'],
      ['/painel/negocio/ofertas', '22-painel-ofertas-e-validar-cupom'],
      ['/painel/negocio/estatisticas', '23-painel-estatisticas'],
      ['/painel/negocio/divulgar', '24-painel-divulgar'],
      ['/painel/negocio/mais', '25-painel-mais'],
    ])
      celular.push(await tirar(p, rota, nome, path.join(telas, 'celular-claro')))
    await tirar(p, '/painel/negocio/divulgar/cartaz', '26-cartaz-qr-para-imprimir', path.join(telas, 'celular-claro'), { inteira: true })
    await ctx.close()
  }
  {
    const { ctx, p } = await contexto({ tema: 'escuro' })
    for (const [rota, nome] of [
      ['/', '01-inicio-escuro'],
      ['/negocio/salao-da-ana', '04-perfil-negocio-escuro'],
      ['/ofertas', '07-ofertas-escuro'],
    ])
      celular.push(await tirar(p, rota, nome, path.join(telas, 'celular-escuro')))
    await ctx.close()
  }
  {
    const { ctx, p } = await contexto({ desktop: true })
    await tirar(p, '/', 'computador-inicio', path.join(telas, 'computador'), { inteira: true })
    await tirar(p, '/negocio/salao-da-ana', 'computador-perfil-negocio', path.join(telas, 'computador'), { inteira: true })
    await ctx.close()
  }
  {
    const { ctx, p } = await contexto({ desktop: true, login: 'ana@tangua-teste.app' })
    await tirar(p, '/painel/negocio', 'computador-painel-lojista', path.join(telas, 'computador'), { inteira: true })
    await ctx.close()
  }
  // imagem de compartilhamento do perfil (aparece no WhatsApp)
  const og = await fetch(`${BASE}/negocio/salao-da-ana`).then((r) => r.text())
  const urlOg = og.match(/property="og:image" content="([^"]+)"/)?.[1]
  if (urlOg) {
    const caminho = new URL(urlOg).pathname + new URL(urlOg).search
    fs.writeFileSync(path.join(telas, 'link-compartilhado-whatsapp.png'), Buffer.from(await (await fetch(BASE + caminho)).arrayBuffer()))
  }
  console.log('prints ok')
}

// ---------------------------------------------------------------- mockups de celular
async function mockups() {
  const pasta = path.join(telas, 'mockups-celular')
  fs.mkdirSync(pasta, { recursive: true })
  const p = await nav.newPage({ viewport: { width: 520, height: 1040 }, deviceScaleFactor: 3 })
  for (const arquivo of celular) {
    const img = `data:image/png;base64,${fs.readFileSync(arquivo).toString('base64')}`
    await p.setContent(`<style>html,body{margin:0;background:transparent}</style>
      <div id="m" style="width:440px;height:896px;padding:40px;box-sizing:content-box;display:flex;align-items:center;justify-content:center">
        <div style="width:420px;height:876px;border-radius:64px;background:#0B0F0D;padding:14px;box-sizing:border-box;box-shadow:0 30px 60px -18px rgba(19,36,29,.45), inset 0 0 0 2px #2A332F">
          <div style="position:relative;width:100%;height:100%;border-radius:52px;overflow:hidden;background:#fff">
            <img src="${img}" style="width:100%;height:100%;object-fit:fill;display:block">
            <div style="position:absolute;top:12px;left:50%;transform:translateX(-50%);width:120px;height:34px;border-radius:20px;background:#0B0F0D"></div>
          </div>
        </div>
      </div>`)
    await p.locator('#m').screenshot({ path: path.join(pasta, `mockup-${path.basename(arquivo)}`), omitBackground: true })
  }
  await p.close()
  console.log('mockups ok')
}

if (process.argv[3] === 'so-mockups') {
  for (const pasta of ['celular-claro', 'celular-escuro']) {
    for (const f of fs.readdirSync(path.join(telas, pasta))) if (!/completo|cartaz/.test(f)) celular.push(path.join(telas, pasta, f))
  }
} else {
  await logos()
  await prints()
}
await mockups()
await nav.close()
