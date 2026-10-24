// Barra inferior fixa e consistente no celular (iPhone e Android).
// Uso: node e2e/barra-inferior.mjs <baseURL> [pasta-prints]
import { chromium, devices } from '@playwright/test'
const BASE = process.argv[2] ?? 'http://localhost:3100'
const saida = process.argv[3]
const nav = await chromium.launch()
let falhas = 0
const ok = (m) => console.log('  ✔ ' + m)
const ruim = (m) => { falhas++; console.log('  ✘ ' + m) }

for (const [nome, disp] of [['iPhone 13', devices['iPhone 13']], ['Pixel 7', devices['Pixel 7']]]) {
  console.log(`\n▶ ${nome}`)
  const ctx = await nav.newContext({ ...disp })
  await ctx.addInitScript(() => { try { localStorage.setItem('tangua-convite-adiado-ate', '9999999999999') } catch {} })
  const p = await ctx.newPage()
  const posicao = () => p.evaluate(() => {
    const n = document.querySelector('nav[aria-label="Navegação principal"]')
    if (!n) return null
    const r = n.getBoundingClientRect()
    return { topo: Math.round(r.top), base: Math.round(r.bottom), altura: Math.round(r.height), janela: window.innerHeight, visivel: getComputedStyle(n).display !== 'none' && r.bottom <= window.innerHeight + 1 && r.top < window.innerHeight }
  })
  for (const rota of ['/', '/buscar', '/ofertas', '/agenda', '/orcamentos', '/perfil', '/mural', '/vagas', '/negocio/gl-digital', '/categoria/tecnologia', '/ajuda']) {
    await p.goto(BASE + rota, { waitUntil: 'networkidle' })
    await p.waitForTimeout(1300)
    const a = await posicao()
    if (!a?.visivel) { ruim(`${rota}: barra não está visível no rodapé (${JSON.stringify(a)})`); continue }
    // rola até o fim e volta: a barra não pode sair do lugar
    await p.mouse.wheel(0, 4000); await p.waitForTimeout(400)
    const b = await posicao()
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300)
    const c = await posicao()
    if (a.base !== b.base || a.base !== c.base || a.base !== a.janela) ruim(`${rota}: barra mudou de posição (${a.base}/${b.base}/${c.base}, janela ${a.janela})`)
    else ok(`${rota}: barra fixa no rodapé (altura ${a.altura}px)`)
    const zoom = await p.evaluate(() => document.querySelector('meta[name=viewport]')?.getAttribute('content'))
    if (rota === '/' && !/maximum-scale=1/.test(zoom ?? '')) ruim(`zoom ainda liberado: ${zoom}`)
    const estouro = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    if (estouro > 1) ruim(`${rota}: tela mais larga que o celular (${estouro}px)`)
  }
  // perfil do negócio: barra de contato logo acima da navegação
  await p.goto(BASE + '/negocio/gl-digital', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  const contato = await p.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Navegação principal"]').getBoundingClientRect()
    const barra = [...document.querySelectorAll('a')].find((a) => a.textContent?.includes('Chamar no WhatsApp') && a.getBoundingClientRect().bottom > window.innerHeight - 200)
    const r = barra?.closest('div.barra-fixa')?.getBoundingClientRect()
    return r ? { baseContato: Math.round(r.bottom), topoNav: Math.round(nav.top) } : null
  })
  if (contato && Math.abs(contato.baseContato - contato.topoNav) <= 1) ok('perfil do negócio: WhatsApp/Orçamento logo acima da navegação')
  else ruim(`perfil do negócio: barra de contato fora do lugar ${JSON.stringify(contato)}`)
  if (saida) await p.screenshot({ path: `${saida}/barra-negocio-${nome.replace(' ', '')}.png` })
  // teclado: focar um campo esconde a barra; sair do campo traz de volta
  await p.goto(BASE + '/buscar', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1200)
  await p.focus('input[name=q]')
  await p.waitForTimeout(400)
  const comTeclado = await posicao()
  if (comTeclado.topo >= comTeclado.janela - 1) ok('teclado aberto: barra sai de cena')
  else ruim(`teclado aberto: barra continua na tela (${JSON.stringify(comTeclado)})`)
  await p.evaluate(() => document.activeElement.blur())
  await p.waitForTimeout(500)
  const depois = await posicao()
  if (depois.visivel && depois.base === depois.janela) ok('teclado fechado: barra volta')
  else ruim(`teclado fechado: barra não voltou (${JSON.stringify(depois)})`)
  const fonte = await p.evaluate(() => getComputedStyle(document.querySelector('input[name=q]')).fontSize)
  if (parseFloat(fonte) >= 16) ok(`campo de busca com ${fonte} (iPhone não dá zoom ao tocar)`)
  else ruim(`campo de busca com ${fonte}: iPhone daria zoom`)
  await ctx.close()
}
await nav.close()
console.log(`\n${falhas} falha(s)`)
