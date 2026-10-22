/**
 * Diagnóstico da integração Mercado Pago — usa o MESMO cliente do app.
 *
 *   npx tsx scripts/testar-mercadopago.ts [email-do-pagador-de-teste]
 *
 * 1. Valida o token (GET /users/me).
 * 2. Cria uma assinatura PENDENTE de R$ 1,00 (nada é cobrado: cobrança só
 *    acontece se alguém abrir o link e pagar) e confere o init_point.
 * 3. Lê de volta e CANCELA na hora. Confere que ficou "cancelled".
 * 4. Confere que o webhook está publicado (GET deve dar 405) e que um POST
 *    sem assinatura é recusado (401) — esse POST grava 1 linha "ignorado"
 *    em eventos_webhook, igual a qualquer requisição forjada.
 * Não imprime token nem segredo.
 */
import 'dotenv/config'
import { createHmac } from 'node:crypto'
import { clienteMercadoPago } from '../lib/pagamentos/mercadopago'
import { validarAssinaturaWebhook } from '../lib/pagamentos/assinatura-webhook'

const ok = (m: string) => console.log(`  ✔ ${m}`)
const falha = (m: string) => {
  console.log(`  ✘ ${m}`)
  process.exitCode = 1
}

async function main() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  const segredo = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '')
  if (!token) return falha('MERCADOPAGO_ACCESS_TOKEN ausente')

  console.log('\n1) Token')
  const eu = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${token}` } })
  if (!eu.ok) return falha(`token recusado pelo Mercado Pago (HTTP ${eu.status})`)
  const conta = (await eu.json()) as { id: number; site_id: string; email?: string; nickname?: string }
  ok(`token válido — conta ${conta.id}, país ${conta.site_id}${conta.nickname?.startsWith('TESTUSER') ? ' (usuário de TESTE)' : ''}`)
  if (conta.site_id !== 'MLB') falha('a conta não é do Brasil (MLB) — moeda BRL não vai funcionar')

  console.log('\n2) Criar assinatura pendente (sem cobrança)')
  const referencia = `diagnostico-${Date.now()}`
  const pagador = process.argv[2] ?? `teste.tangua.${Date.now()}@example.com`
  let id: string | null = null
  try {
    const criada = await clienteMercadoPago.criarAssinatura({
      motivo: 'Tanguá App — teste de integração (cancelado automaticamente)',
      referenciaExterna: referencia,
      emailPagador: pagador,
      valor: 1,
      urlRetorno: `${site || 'https://tangua-app.vercel.app'}/painel/negocio/assinatura?retorno=1`,
    })
    id = criada.id
    ok(`assinatura criada: ${criada.id} (status ${criada.status})`)
    criada.init_point?.startsWith('https://') ? ok('link de pagamento (init_point) devolvido') : falha('sem init_point na resposta')
    criada.external_reference === referencia ? ok('external_reference preservado') : falha('external_reference não voltou igual')
  } catch (err) {
    const e = err as { status?: number; message: string; corpo?: { message?: string; cause?: unknown } }
    falha(`criação recusada: ${e.message}`)
    if (e.corpo) console.log('    detalhe do Mercado Pago:', JSON.stringify(e.corpo).slice(0, 400))
  }

  if (id) {
    console.log('\n3) Ler e cancelar')
    const lida = await clienteMercadoPago.buscarAssinatura(id)
    lida.id === id ? ok(`leitura ok (status ${lida.status})`) : falha('leitura devolveu outra assinatura')
    const cancelada = await clienteMercadoPago.cancelarAssinatura(id)
    cancelada.status === 'cancelled' ? ok('cancelada — nenhuma cobrança será feita') : falha(`status após cancelar: ${cancelada.status}`)
  }

  console.log('\n4) Webhook')
  if (!segredo) falha('MERCADOPAGO_WEBHOOK_SECRET ausente')
  else {
    const ts = String(Date.now())
    const v1 = createHmac('sha256', segredo).update(`id:123;request-id:abc;ts:${ts};`).digest('hex')
    validarAssinaturaWebhook({ xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'abc', dataId: '123', segredo }).valida
      ? ok('validação HMAC local com o segredo do .env funciona')
      : falha('validação HMAC local falhou')
  }
  if (!site) falha('NEXT_PUBLIC_SITE_URL ausente — não dá pra testar a URL pública')
  else {
    const url = `${site}/api/webhooks/mercadopago`
    const get = await fetch(url, { method: 'GET' })
    get.status === 405 ? ok(`rota publicada: ${url}`) : falha(`GET ${url} → HTTP ${get.status} (esperado 405: rota existe e só aceita POST)`)
    const post = await fetch(`${url}?data.id=1&type=payment`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-signature': 'ts=1,v1=forjado', 'x-request-id': 'diagnostico' },
      body: JSON.stringify({ type: 'payment', data: { id: '1' } }),
    })
    post.status === 401 ? ok('POST com assinatura forjada recusado (401)') : falha(`POST forjado → HTTP ${post.status} (esperado 401)`)
  }
  console.log(process.exitCode ? '\nResultado: há falhas acima.' : '\nResultado: integração respondendo como esperado.')
}

main().catch((err) => {
  console.error('Erro inesperado:', (err as Error).message)
  process.exitCode = 1
})
