// O service worker precisa ficar pronto rápido: sem ele não há notificação nem modo offline.
// Uso: node e2e/service-worker.mjs <baseURL>
import { chromium, devices } from '@playwright/test'

const base = process.argv[2] ?? 'https://tangua-app.vercel.app'
const nav = await chromium.launch()
let falhas = 0
for (const [rotulo, rede] of [
  ['Wi-Fi', null],
  ['4G lento', { download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8, latency: 150 }],
]) {
  const ctx = await nav.newContext({ ...devices['Pixel 7'], serviceWorkers: 'allow' })
  const p = await ctx.newPage()
  if (rede) {
    const cdp = await ctx.newCDPSession(p)
    await cdp.send('Network.emulateNetworkConditions', { offline: false, downloadThroughput: rede.download, uploadThroughput: rede.upload, latency: rede.latency })
  }
  await p.goto(base + '/', { waitUntil: 'domcontentloaded' })
  const r = await p.evaluate(async () => {
    const t = performance.now()
    await Promise.race([navigator.serviceWorker.ready, new Promise((ok) => setTimeout(ok, 30000))])
    const reg = await navigator.serviceWorker.getRegistration()
    return { pronto: !!reg?.active, s: ((performance.now() - t) / 1000).toFixed(1) }
  })
  if (!r.pronto || Number(r.s) > 15) falhas++
  console.log(`${r.pronto ? '✔' : '✘'} ${rotulo}: service worker ${r.pronto ? 'pronto' : 'NÃO ficou pronto'} em ${r.s}s`)
  await ctx.close()
}
await nav.close()
console.log(`${falhas} falha(s)`)
process.exitCode = falhas ? 1 : 0
