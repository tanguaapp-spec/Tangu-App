// Recorte de foto da capa: escolher → recortar → prévia → salvar. Conta @tangua-teste.app.
// Uso: BASE=http://localhost:3005 node e2e/recorte-foto.mjs <senhas.json> <pasta-prints>
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3005'
const [arquivoSenhas, SHOTS] = process.argv.slice(2)
const senhas = JSON.parse(fs.readFileSync(arquivoSenhas, 'utf8'))
fs.mkdirSync(SHOTS, { recursive: true })
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
await p.goto(`${BASE}/entrar`)
await p.fill('#email', 'ana@tangua-teste.app')
await p.fill('#senha', senhas['ana@tangua-teste.app'])
await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/entrar')), p.click('form button[type=submit]')])

// negócio pra ter painel
await p.goto(`${BASE}/painel/negocio/cadastrar`)
await p.fill('#nome', '[TESTE] Recorte de Foto')
await p.selectOption('#categoria_id', { index: 1 })
await p.fill('#whatsapp', '21990000001')
await p.fill('#descricao', 'Teste do recorte de foto.')
await p.fill('#bairro', 'Centro')
if (await p.locator('#endereco').count()) await p.fill('#endereco', 'Rua de Teste, 10')
await p.locator('form button[type=submit]').click()
await p.waitForURL(/\/painel\/negocio(\?|$)/, { timeout: 30000 }).catch(() => {})

// imagem de teste 1200x900 gerada no navegador
const png = await p.evaluate(() => {
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 900
  const g = c.getContext('2d')
  const gr = g.createLinearGradient(0, 0, 1200, 900)
  gr.addColorStop(0, '#0E4D3A')
  gr.addColorStop(1, '#F26A1B')
  g.fillStyle = gr
  g.fillRect(0, 0, 1200, 900)
  return c.toDataURL('image/png').split(',')[1]
})
const arquivo = path.join(SHOTS, 'teste-capa.png')
fs.writeFileSync(arquivo, Buffer.from(png, 'base64'))

await p.goto(`${BASE}/painel/negocio/perfil`)
await p.setInputFiles('#foto_capa', arquivo)
const dialogo = p.getByRole('dialog', { name: 'Ajustar foto' })
try {
  await dialogo.waitFor({ timeout: 10000 })
  ok('recorte abre ao escolher a foto')
} catch {
  ruim('recorte não abriu')
}
if ((await dialogo.getByText('Como vai aparecer').count()) && (await dialogo.locator('figure').count()) === 3) ok('3 prévias (perfil, página inicial, busca)')
else ruim('prévias não apareceram')
const sem = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
if (sem > 1) ruim(`recorte mais largo que o celular (${sem}px)`)
// arrasta e dá zoom
const area = dialogo.locator('div.touch-none')
const box = await area.boundingBox()
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await p.mouse.down()
await p.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 - 10)
await p.mouse.up()
await dialogo.getByLabel('Aumentar zoom').click()
await p.screenshot({ path: path.join(SHOTS, 'recorte-1.png') })
await dialogo.getByRole('button', { name: 'Usar esta foto' }).click()
await dialogo.waitFor({ state: 'detached', timeout: 10000 }).then(() => ok('confirmar fecha o recorte')).catch(() => ruim('recorte não fechou'))
const tamanho = await p.evaluate(() => {
  const i = document.querySelector('input[name=foto_capa]')
  return i?.files?.[0] ? { tipo: i.files[0].type, kb: Math.round(i.files[0].size / 1024) } : null
})
if (tamanho?.tipo === 'image/jpeg') ok(`foto recortada pronta pra enviar (JPEG, ${tamanho.kb} KB)`)
else ruim('arquivo recortado não foi pro formulário')
await p.locator('form button[type=submit]').last().click()
await p.getByText('Dados salvos com sucesso').waitFor({ timeout: 30000 }).then(() => ok('perfil salvo com a capa recortada')).catch(() => ruim('não salvou'))
await p.screenshot({ path: path.join(SHOTS, 'recorte-2.png'), fullPage: true })

await nav.close()
console.log(`\n${falhas} falha(s)`)
process.exitCode = falhas ? 1 : 0
