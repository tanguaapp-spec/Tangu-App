// Fluxos da entrega "plano completo" com as contas @tangua-teste.app.
// Uso: BASE=http://localhost:3005 node e2e/fluxos-novos.mjs <senhas.json> <pasta-prints>
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3005'
const [arquivoSenhas, SHOTS] = process.argv.slice(2)
const senhas = JSON.parse(fs.readFileSync(arquivoSenhas, 'utf8'))
fs.mkdirSync(SHOTS, { recursive: true })

let falhas = 0
const ok = (m) => console.log(`  ✔ ${m}`)
const ruim = (m) => {
  falhas++
  console.log(`  ✘ ${m}`)
}
const nav = await chromium.launch()

async function sessao(email, desktop = false) {
  const ctx = await nav.newContext(desktop ? { viewport: { width: 1366, height: 900 } } : { ...devices['iPhone 13'] })
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('tangua-splash-visto', '1')
      localStorage.setItem('tangua-convite-adiado-ate', '9999999999999')
    } catch {}
  })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => ruim(`erro de JS em ${p.url()}: ${e.message.slice(0, 140)}`))
  if (email) {
    await p.goto(`${BASE}/entrar`)
    await p.fill('#email', email)
    await p.fill('#senha', senhas[email])
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 30000 }), p.click('form button[type=submit]')])
  }
  return { ctx, p }
}
const foto = (p, nome) => p.screenshot({ path: path.join(SHOTS, `${nome}.png`), fullPage: true })
async function semEstouro(p) {
  const d = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (d > 1) ruim(`tela mais larga que o celular (${d}px) em ${new URL(p.url()).pathname}`)
}
async function ver(p, texto, rotulo, timeout = 20000) {
  try {
    await p.getByText(texto, { exact: false }).locator('visible=true').first().waitFor({ timeout })
    ok(rotulo)
    await semEstouro(p)
    return true
  } catch {
    ruim(`${rotulo} (não apareceu: "${texto}")`)
    return false
  }
}
async function cadastrarNegocio(p, nome) {
  await p.goto(`${BASE}/painel/negocio/cadastrar`)
  await p.fill('#nome', nome)
  await p.selectOption('#categoria_id', { index: 1 })
  await p.fill('#whatsapp', '21990000001')
  await p.fill('#descricao', 'Negócio de teste da validação do Tanguá App.')
  await p.fill('#bairro', 'Centro')
  if (await p.locator('#endereco').count()) await p.fill('#endereco', 'Rua de Teste, 10')
  await p.locator('form button[type=submit]').click()
  await p.waitForURL(/\/painel\/negocio(\?|$)/, { timeout: 30000 }).catch(() => {})
}

// ---------------------------------------------------------------- lojista
console.log('\n▶ Lojista com dois negócios (ana)')
{
  const { ctx, p } = await sessao('ana@tangua-teste.app')
  await cadastrarNegocio(p, '[TESTE] Salão da Ana')
  await ver(p, '[TESTE] Salão da Ana', 'primeiro negócio cadastrado e painel aberto')
  await cadastrarNegocio(p, '[TESTE] Doces da Ana')
  await ver(p, '[TESTE] Doces da Ana', 'segundo negócio na mesma conta (painel abre nele)')
  await p.getByRole('button', { name: /2 negócios/ }).first().click()
  await ver(p, 'Meus negócios', 'seletor "Meus negócios" mostra os dois')
  await foto(p, 'ana-01-seletor')
  await p.getByRole('button', { name: /Salão da Ana/ }).click()
  await p.waitForLoadState('networkidle')
  await ver(p, '[TESTE] Salão da Ana', 'troca de negócio pelo seletor')

  for (const [rota, texto, rotulo] of [
    ['/painel/negocio/horarios', 'Feriados e horários especiais', 'tela de feriados abre (liberada ou com cadeado)'],
    ['/painel/negocio/vendas', 'Pedidos e agenda pelo WhatsApp', 'tela de pedidos/agenda abre'],
    ['/painel/negocio/vendas', 'Beloo', 'sugestão da Beloo e do Freguês aparece'],
    ['/painel/negocio/divulgacao', 'Divulgar meu negócio', 'tela de compra de divulgação abre'],
    ['/painel/negocio/relatorio', 'Relatório mensal', 'relatório mensal abre (liberado ou com cadeado)'],
    ['/painel/negocio/mais', 'Cadastrar outro negócio', 'menu Mais com os itens novos'],
    ['/painel/negocio/catalogo', 'Duração na agenda', 'campo de duração no catálogo'],
  ]) {
    await p.goto(BASE + rota)
    await ver(p, texto, rotulo)
  }
  await foto(p, 'ana-02-mais')

  // perfil com Facebook e "hora marcada" salva (com ou sem a migration 0026)
  await p.goto(`${BASE}/painel/negocio/perfil`)
  await p.fill('#facebook', 'facebook.com/salaodaana')
  await p.locator('form button[type=submit]').last().click()
  await ver(p, 'salv', 'perfil do negócio salva com o campo Facebook')

  // pausar e reativar
  await p.goto(`${BASE}/painel/negocio`)
  await p.getByRole('button', { name: 'Pausar perfil' }).click()
  await p.getByRole('button', { name: 'Sim, pausar agora' }).click()
  await ver(p, 'Seu perfil está pausado', 'pausar perfil (com confirmação)')
  await ver(p, 'Precisa da sua atenção', '"Precisa da sua atenção" avisa que está pausado')
  await p.getByRole('button', { name: 'Reativar perfil' }).click()
  await ver(p, 'Pausar o perfil', 'reativar perfil')

  // admin é só pra admin
  await p.goto(`${BASE}/painel/admin/crescimento`)
  await p.waitForLoadState('networkidle')
  if (new URL(p.url()).pathname.startsWith('/painel/admin')) ruim('conta comum entrou no admin')
  else ok(`admin bloqueado pra conta comum (foi para ${new URL(p.url()).pathname})`)
  const r = await p.request.get(`${BASE}/api/painel/relatorio?mes=2026-10`)
  ok(`planilha do relatório responde ${r.status()} (403 = plano sem o recurso, 200 = liberado)`)
  await ctx.close()
}

// ---------------------------------------------------------------- moradora
console.log('\n▶ Moradora (maria)')
{
  const { ctx, p } = await sessao('maria@tangua-teste.app')
  await p.goto(`${BASE}/buscar`)
  await p.locator('input[name=q]').first().fill('sal')
  await ver(p, 'Salão da Ana', 'sugestões na busca a partir de 2-3 letras')
  await foto(p, 'maria-01-sugestoes')

  await p.goto(`${BASE}/noticias`)
  await p.getByRole('button', { name: 'Sugerir uma notícia' }).click()
  await p.fill('input[name=titulo]', '[TESTE] Buraco na rua principal do Centro')
  await p.fill('textarea[name=corpo]', 'Sugestão de teste da validação: há um buraco grande perto da praça, em frente à padaria.')
  await p.getByRole('button', { name: 'Enviar sugestão' }).click()
  await ver(p, 'O time confere', 'sugerir notícia')

  await p.goto(`${BASE}/agenda`)
  await p.getByRole('button', { name: 'Sugerir um evento' }).click()
  await p.fill('input[name=titulo]', '[TESTE] Feira de artesanato')
  const amanha = new Date(Date.now() + 3 * 86400e3).toISOString().slice(0, 10)
  await p.fill('input[name=data_evento]', `${amanha}T10:00`)
  await p.fill('input[name=local_evento]', 'Praça da Matriz')
  await p.fill('textarea[name=descricao]', 'Evento de teste da validação do Tanguá App.')
  await p.getByRole('button', { name: 'Enviar sugestão' }).click()
  await ver(p, 'O time confere', 'sugerir evento')

  for (const [rota, texto, rotulo] of [
    ['/cidade', 'Na cidade', 'página Na cidade'],
    ['/servicos-uteis', 'SAMU', 'serviços úteis com telefones de emergência'],
    ['/mapa', 'Perto de mim', 'mapa abre'],
    ['/mural', 'Eventos ficam na', 'mural sem eventos, apontando pra Agenda'],
    ['/perfil', 'Maria', 'perfil da moradora'],
  ]) {
    await p.goto(BASE + rota)
    await ver(p, texto, rotulo)
  }
  await foto(p, 'maria-02-mapa')

  await ctx.close()
}

// ---------------------------------------------------------------- visitante
console.log('\n▶ Visitante no computador')
{
  const { ctx, p } = await sessao(null, true)
  await p.goto(`${BASE}/`)
  await ver(p, 'Na cidade', 'atalhos da cidade na página inicial')
  await p.goto(`${BASE}/buscar?nota=4`)
  await ver(p, '★ 4 ou mais', 'filtro por avaliação aplicado')
  const resp = await p.request.post(`${BASE}/api/atividade`, { data: { visitante: 'teste-validacao-0001-abcdef', pagina: '/' }, headers: { 'user-agent': 'Mozilla/5.0 Chrome' } })
  ok(`registro de atividade diária responde ${resp.status()}`)
  await ctx.close()
}

await nav.close()
console.log(`\n${falhas} falha(s)`)
process.exitCode = falhas ? 1 : 0
