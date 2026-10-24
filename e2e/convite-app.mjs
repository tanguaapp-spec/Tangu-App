// Convite de instalar + notificações na primeira visita (Android, iPhone, computador).
// Uso: node e2e/convite-app.mjs <baseURL> [pasta-prints]
// Não ativa notificação de verdade (o navegador de teste não tem serviço de push).
import { chromium, devices } from '@playwright/test'

const BASE = process.argv[2] ?? 'http://localhost:3100'
const saida = process.argv[3]
const nav = await chromium.launch()
let falhas = 0
const ok = (m) => console.log('  ✔ ' + m)
const ruim = (m) => {
  falhas++
  console.log('  ✘ ' + m)
}

for (const [nome, disp, espera] of [
  ['Android (Pixel 7)', devices['Pixel 7'], 'menu'],
  ['iPhone 13', devices['iPhone 13'], 'Adicionar à Tela de Início'],
  ['Computador', { viewport: { width: 1366, height: 900 } }, 'Chrome ou Edge'],
]) {
  console.log(`\n▶ ${nome}`)
  const ctx = await nav.newContext({ ...disp })
  // o navegador de teste nega notificação por padrão; num celular comum começa como "perguntar"
  await ctx.addInitScript(() => {
    try {
      Object.defineProperty(Notification, 'permission', { get: () => 'default' })
    } catch {}
  })
  const p = await ctx.newPage()
  await p.goto(BASE + '/buscar', { waitUntil: 'networkidle' })
  const dialogo = p.getByRole('dialog', { name: 'Tanguá no seu celular' })
  try {
    await dialogo.waitFor({ timeout: 8000 })
    ok('convite aparece sozinho na primeira visita')
  } catch {
    ruim('convite não apareceu na primeira visita')
    await ctx.close()
    continue
  }
  if (await dialogo.getByText('Instale o app').count()) ok('passo 1: instalar')
  else ruim('passo 1 ausente')
  if (await dialogo.getByText(espera, { exact: false }).count()) ok(`instrução certa pro aparelho ("${espera}")`)
  else ruim(`instrução esperada não apareceu: ${espera}`)
  if (await dialogo.getByRole('button', { name: 'Ativar notificações' }).count()) ok('passo 2: botão "Ativar notificações"')
  else ruim('botão de ativar notificações ausente')
  if (saida) await p.screenshot({ path: `${saida}/convite-${nome.replace(/\W+/g, '-')}.png` })
  await dialogo.getByRole('button', { name: 'Agora não' }).click()
  await p.waitForTimeout(400)
  if (!(await dialogo.count())) ok('"Agora não" fecha')
  else ruim('não fechou')
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(3500)
  if (!(await p.getByRole('dialog', { name: 'Tanguá no seu celular' }).count())) ok('não reaparece logo depois (volta em 3 dias)')
  else ruim('reapareceu na mesma hora')
  await ctx.close()
}
await nav.close()
console.log(`\n${falhas} falha(s)`)
