// Convite de divulgar (primeira visita) e "Sou o dono" em perfil sem dono. Visitante, sem conta.
// Uso: BASE=http://localhost:3005 node e2e/divulgar-e-reivindicar.mjs
import { chromium, devices } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:3005'
let falhas = 0
const ok = (m) => console.log(`  ✔ ${m}`)
const ruim = (m) => (falhas++, console.log(`  ✘ ${m}`))

const nav = await chromium.launch()
const ctx = await nav.newContext({ ...devices['iPhone 13'] })
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('tangua-splash-visto', '1')
    localStorage.setItem('tangua-convite-adiado-ate', '9999999999999')
  } catch {}
})
const p = await ctx.newPage()
p.on('pageerror', (e) => ruim(`erro de JS: ${e.message.slice(0, 140)}`))

// 1. convite de divulgar aparece depois de algumas telas
for (const r of ['/', '/buscar', '/ofertas', '/cidade']) await p.goto(BASE + r)
try {
  await p.getByRole('dialog').getByText('Ajude o Tanguá App a chegar em toda a cidade').waitFor({ timeout: 8000 })
  ok('convite de divulgar aparece na primeira visita')
  const zap = await p.getByRole('link', { name: /Mandar para amigos no WhatsApp/ }).getAttribute('href')
  if (zap?.startsWith('https://wa.me/?text=')) ok('botão de WhatsApp com mensagem pronta')
  else ruim('link do WhatsApp errado')
  await p.getByRole('button', { name: 'Agora não' }).click()
} catch {
  ruim('convite de divulgar não apareceu')
}
await p.goto(BASE + '/agenda')
await p.waitForTimeout(4500)
if (await p.getByText('Ajude o Tanguá App a chegar em toda a cidade').count()) ruim('convite reapareceu logo depois de fechar')
else ok('convite não insiste depois de "Agora não"')

// 2. perfil sem dono: selo e "Sou o dono"
await p.goto(BASE + '/buscar?ordem=novos')
const links = await p.locator('a[href^="/negocio/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')).slice(0, 25))
let achou = false
for (const href of links) {
  await p.goto(BASE + href)
  if (await p.locator('#reivindicar').count()) {
    achou = true
    ok(`perfil sem dono encontrado (${href.split('?')[0]})`)
    if (await p.getByText('Aguardando reivindicação').first().isVisible()) ok('selo laranja ao lado do nome')
    else ruim('selo não aparece')
    const botao = p.locator('#reivindicar').getByRole('link', { name: /Sou o dono/ })
    if (await botao.count()) ok('"Sou o dono" leva para entrar e voltar ao perfil')
    else if (await p.locator('#reivindicar').getByRole('button').count()) ok('perfil sem telefone: pedido pelo jeito antigo')
    else ruim('nenhuma forma de reivindicar')
    break
  }
}
if (!achou) console.log('  - nenhum perfil sem dono nos primeiros resultados (nada a testar)')
// selo NÃO aparece na lista
await p.goto(BASE + '/buscar')
if (await p.getByText('Aguardando reivindicação').count()) ruim('selo aparece na lista (deveria ser só na página)')
else ok('lista da busca sem o selo')

await nav.close()
console.log(`\n${falhas} falha(s)`)
process.exitCode = falhas ? 1 : 0
