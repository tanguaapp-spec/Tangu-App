// Auditoria de páginas: claro/escuro × celular/desktop.
// Uso: node e2e/auditoria-visual.mjs <baseURL> <pasta-de-saida>
// Checa por rota: status HTTP, erro de JS, rolagem horizontal (layout
// estourando no celular), botão/link sem nome acessível, imagem sem alt,
// e tira screenshot. Não depende de login nem de dados.
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const base = process.argv[2] ?? 'http://localhost:3100'
const saida = process.argv[3] ?? 'auditoria'
fs.mkdirSync(saida, { recursive: true })

const ROTAS = [
  '/', '/buscar', '/buscar?categoria=beleza-estetica', '/vagas', '/mural', '/ferramentas', '/planos',
  '/ajuda', '/ajuda?q=senha', '/ajuda/recuperar-acesso', '/ajuda/planos-e-pagamentos', '/ajuda/contato',
  '/privacidade', '/termos', '/entrar', '/entrar?erro=link-invalido', '/cadastrar', '/cadastrar?papel=profissional',
  '/cadastrar/confirme-seu-email', '/esqueci-senha', '/redefinir-senha',
  '/negocio/00000000-0000-0000-0000-000000000000', '/rota-que-nao-existe',
  // protegidas: devem redirecionar pro login sem quebrar
  '/perfil', '/favoritos', '/notificacoes', '/orcamentos', '/orcamentos/novo', '/bem-vindo', '/ajuda/chamados',
  '/painel/negocio', '/painel/negocio/assinatura', '/painel/negocio/orcamentos', '/painel/admin', '/painel/admin/planos',
]

const CENARIOS = [
  { nome: 'mobile-claro', dispositivo: devices['iPhone 13'], tema: 'claro' },
  { nome: 'mobile-escuro', dispositivo: devices['iPhone 13'], tema: 'escuro' },
  { nome: 'desktop-claro', dispositivo: { viewport: { width: 1366, height: 900 } }, tema: 'claro' },
  { nome: 'desktop-escuro', dispositivo: { viewport: { width: 1366, height: 900 } }, tema: 'escuro' },
]

const navegador = await chromium.launch()
const relatorio = []

for (const cen of CENARIOS) {
  const ctx = await navegador.newContext({ ...cen.dispositivo, colorScheme: cen.tema === 'escuro' ? 'dark' : 'light' })
  await ctx.addInitScript((tema) => {
    try {
      localStorage.setItem('tangua-tema', tema)
    } catch {}
  }, cen.tema)

  for (const rota of ROTAS) {
    const pagina = await ctx.newPage()
    const errosJs = []
    pagina.on('pageerror', (e) => errosJs.push(e.message))
    let status = 0
    let urlFinal = ''
    try {
      const resp = await pagina.goto(base + rota, { waitUntil: 'networkidle', timeout: 30000 })
      status = resp?.status() ?? 0
      urlFinal = pagina.url().replace(base, '')
      await pagina.waitForTimeout(1300) // splash some
      const analise = await pagina.evaluate(() => {
        const doc = document.documentElement
        const estouro = doc.scrollWidth - doc.clientWidth
        const semNome = [...document.querySelectorAll('button, a[href]')]
          .filter((el) => {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return false
            const nome = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim()
            const imgAlt = [...el.querySelectorAll('img')].some((i) => i.alt?.trim())
            return !nome && !imgAlt
          })
          .map((el) => el.outerHTML.slice(0, 120))
        const imgSemAlt = [...document.querySelectorAll('img')].filter((i) => !i.hasAttribute('alt')).map((i) => i.src.slice(0, 80))
        const escuro = doc.classList.contains('dark')
        const fundo = getComputedStyle(document.body).backgroundColor
        return { estouro, semNome, imgSemAlt, escuro, fundo }
      })
      const nomeArquivo = `${cen.nome}__${rota.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'inicio'}.png`
      await pagina.screenshot({ path: path.join(saida, nomeArquivo), fullPage: false })
      relatorio.push({ cenario: cen.nome, rota, status, urlFinal, errosJs, ...analise })
    } catch (e) {
      relatorio.push({ cenario: cen.nome, rota, status, urlFinal, errosJs: [...errosJs, 'FALHA: ' + e.message] })
    }
    await pagina.close()
  }
  await ctx.close()
}
await navegador.close()

fs.writeFileSync(path.join(saida, 'relatorio.json'), JSON.stringify(relatorio, null, 2))
const problemas = relatorio.filter(
  (r) => r.status >= 500 || r.errosJs.length || r.estouro > 1 || r.semNome?.length || r.imgSemAlt?.length || (r.cenario.includes('escuro') ? r.escuro === false : r.escuro === true)
)
console.log(`${relatorio.length} verificações, ${problemas.length} com problema`)
for (const p of problemas) {
  console.log(`\n[${p.cenario}] ${p.rota} → ${p.status} ${p.urlFinal}`)
  if (p.errosJs?.length) console.log('  JS:', p.errosJs.join(' | ').slice(0, 300))
  if (p.estouro > 1) console.log(`  rolagem horizontal: ${p.estouro}px`)
  if (p.semNome?.length) console.log('  sem nome acessível:', p.semNome.slice(0, 3).join('\n    '))
  if (p.imgSemAlt?.length) console.log('  img sem alt:', p.imgSemAlt.slice(0, 3).join(', '))
  if (p.cenario.includes('escuro') ? p.escuro === false : p.escuro === true) console.log('  TEMA ERRADO aplicado')
}
