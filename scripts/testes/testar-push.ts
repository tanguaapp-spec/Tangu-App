/**
 * TESTE DE PONTA A PONTA — WEB PUSH / VAPID
 * ============================================
 * Roda localmente com: npx tsx scripts/testes/testar-push.ts
 *
 * Confirma que as chaves VAPID configuradas na Vercel (as mesmas do .env
 * local) estão corretas e que o fluxo completo funciona:
 *   1. Cria um usuário de teste descartável.
 *   2. Abre a produção de verdade num Chromium real (Playwright), loga,
 *      concede permissão de notificação e clica no sino pra ativar —
 *      exatamente o que um usuário faria.
 *   3. Confirma que a inscrição foi salva em push_subscriptions.
 *   4. Envia um push de teste de verdade pro endpoint salvo, usando a
 *      biblioteca web-push com as mesmas chaves VAPID do servidor.
 *   5. Limpa tudo (inscrição + usuário) ao final.
 */

import 'dotenv/config'
import { chromium } from 'playwright'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'https://tangua-app.vercel.app'
const BASE = process.env.E2E_BASE_URL || 'https://tangua-app.vercel.app'
const DOMINIO_TESTE = 'tangua-app-teste.dev'

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !VAPID_PUBLIC || !VAPID_PRIVATE) {
  console.error('Faltam variáveis de ambiente (Supabase e/ou VAPID) no .env local.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const sufixo = `${Date.now()}`
  const email = `e2e.push.${sufixo}@${DOMINIO_TESTE}`
  const senha = `Teste!${sufixo}Aa1`

  console.log('1. Criando usuário de teste descartável...')
  const { data: userData, error: erroUser } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome_completo: 'E2E Push', papel: 'morador' },
  })
  if (erroUser || !userData.user) throw new Error(`Falha ao criar usuário: ${erroUser?.message}`)
  const userId = userData.user.id

  // Contexto persistente (perfil real em disco) em vez de newContext() —
  // o Chrome desabilita a Push API de propósito em contextos efêmeros tipo
  // incognito (https://crbug.com/41124656), e um newContext() do Playwright
  // conta como isso pro Chrome.
  const perfilTemp = mkdtempSync(join(tmpdir(), 'tangua-push-teste-'))

  try {
    console.log('2. Abrindo produção num navegador real, logando e ativando notificações...')
    const context = await chromium.launchPersistentContext(perfilTemp, {
      headless: false,
      viewport: { width: 1440, height: 900 },
      permissions: ['notifications'],
    })
    const page = await context.newPage()
    page.on('console', (msg) => console.log(`   [console.${msg.type()}] ${msg.text()}`))
    page.on('pageerror', (err) => console.log(`   [pageerror] ${err.message}`))

    await page.goto(`${BASE}/entrar`)
    await page.getByLabel(/e-mail/i).fill(email)
    await page.getByLabel(/senha/i).fill(senha)
    await page.getByRole('button', { name: /entrar/i }).click()
    await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 20000 })
    // navegação completa (não SPA) pra garantir que o script de registro do
    // service worker (injetado pelo next-pwa no <head>) realmente rode.
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })

    const diag = await page.evaluate(async () => {
      const suportaSW = 'serviceWorker' in navigator
      const suportaPush = 'PushManager' in window
      let registrado = false
      let erro: string | null = null
      let registrations: string[] = []
      if (suportaSW) {
        try {
          const existentes = await navigator.serviceWorker.getRegistrations()
          registrations = existentes.map(
            (r) => `scope=${r.scope} active=${!!r.active} installing=${!!r.installing} waiting=${!!r.waiting}`
          )
          const reg = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout esperando SW ready')), 20000)),
          ])
          registrado = !!reg
        } catch (e: any) {
          erro = e?.message || String(e)
        }
      }
      return { suportaSW, suportaPush, registrado, erro, registrations, permissao: Notification.permission }
    })
    console.log('   diagnóstico do navegador:', diag)

    const botaoSino = page.getByRole('button', { name: /ativar notifica/i }).first()
    await botaoSino.waitFor({ state: 'visible', timeout: 15000 })
    await botaoSino.click()
    await expectEm(page, /desativar notifica/i, 15000)

    await context.close()
    console.log('   ✔ Sino mudou para "ativo" — o browser concluiu a inscrição push.')

    console.log('3. Conferindo a inscrição salva no banco...')
    let inscricao: { endpoint: string; p256dh: string; auth: string } | null = null
    for (let tentativa = 0; tentativa < 10 && !inscricao; tentativa++) {
      const { data } = await admin
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth')
        .eq('perfil_id', userId)
        .maybeSingle()
      if (data) inscricao = data
      else await new Promise((r) => setTimeout(r, 1000))
    }
    if (!inscricao) throw new Error('Nenhuma inscrição push apareceu em push_subscriptions após 10s.')
    console.log(`   ✔ Inscrição encontrada (endpoint de ${new URL(inscricao.endpoint).hostname}).`)

    console.log('4. Enviando um push de teste de verdade com as chaves VAPID do servidor...')
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
    const resultado = await webpush.sendNotification(
      {
        endpoint: inscricao.endpoint,
        keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
      },
      JSON.stringify({ title: 'Teste automatizado ✅', body: 'Se você está vendo isso, o VAPID está funcional.' })
    )
    console.log(`   ✔ Push aceito pelo serviço de push (HTTP ${resultado.statusCode}).`)

    console.log('\nRESULTADO: VAPID configurado corretamente e fluxo de push 100% funcional de ponta a ponta.')
  } finally {
    console.log('5. Limpando dados de teste...')
    try {
      await admin.from('push_subscriptions').delete().eq('perfil_id', userId)
    } catch {}
    try {
      await admin.auth.admin.deleteUser(userId)
    } catch {}
    try {
      rmSync(perfilTemp, { recursive: true, force: true })
    } catch {}
    console.log('   ✔ Limpo.')
  }
}

async function expectEm(page: import('playwright').Page, regex: RegExp, timeout: number) {
  await page.getByRole('button', { name: regex }).first().waitFor({ state: 'visible', timeout })
}

main().catch((err) => {
  console.error('\nFALHA:', err?.message || err)
  process.exit(1)
})
