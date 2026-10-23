// Teste de ponta a ponta no site publicado, com as contas @tangua-teste.app.
// Uso: node e2e/demo-ponta-a-ponta.mjs lojistas|moradores|joao|respostas|escolher <pasta com senhas.json e img/>
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'https://tangua-app.vercel.app'
const [etapa, pasta] = process.argv.slice(2)
const senhas = JSON.parse(fs.readFileSync(path.join(pasta, 'senhas.json'), 'utf8'))
const IMG = (n) => path.join(pasta, 'img', `${n}.jpg`)
const SHOTS = path.join(pasta, 'shots')
const ESTADO = path.join(pasta, 'estado.json')
fs.mkdirSync(SHOTS, { recursive: true })
const estado = fs.existsSync(ESTADO) ? JSON.parse(fs.readFileSync(ESTADO, 'utf8')) : {}
const salvarEstado = () => fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2))

let falhas = 0
const ok = (m) => console.log(`  ✔ ${m}`)
const ruim = (m) => {
  falhas++
  console.log(`  ✘ ${m}`)
}

const nav = await chromium.launch()

async function sessao(email, { desktop = false } = {}) {
  const ctx = await nav.newContext(desktop ? { viewport: { width: 1366, height: 900 } } : { ...devices['iPhone 13'] })
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem('tangua-splash-visto', '1')
      localStorage.setItem('tangua-instalar-dispensado', '1')
    } catch {}
  })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => ruim(`erro de JS em ${p.url()}: ${e.message}`))
  if (email) {
    await p.goto(`${BASE}/entrar`)
    await p.fill('#email', email)
    await p.fill('#senha', senhas[email])
    await Promise.all([p.waitForURL((u) => !u.pathname.startsWith('/entrar'), { timeout: 30000 }), p.click('form button[type=submit]')])
    ok(`login ${email} → ${new URL(p.url()).pathname}`)
  }
  return { ctx, p }
}

async function foto(p, nome) {
  await p.waitForTimeout(1500) // tela de abertura some
  await p.screenshot({ path: path.join(SHOTS, `${nome}.png`), fullPage: true })
}

async function semEstouro(p) {
  const d = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  if (d > 1) ruim(`tela mais larga que o celular (${d}px) em ${new URL(p.url()).pathname}`)
}

async function esperarTexto(p, texto, rotulo, timeout = 20000) {
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

// ---------------------------------------------------------------- lojista
const NEGOCIOS = {
  'ana@tangua-teste.app': {
    tipo: 'estabelecimento',
    nome: 'Salão da Ana',
    categoria: 'Beleza e Estética',
    whatsapp: '21991110001',
    descricao: 'Salão de beleza no Centro de Tanguá há 12 anos. Corte, escova, coloração e manicure, com hora marcada pelo WhatsApp. (perfil de demonstração)',
    bairro: 'Centro',
    endereco: 'Rua Exemplo, 100',
    capa: 'capa-salao',
    produtos: [
      ['Corte feminino', '50,00', 'Lavagem inclusa', 'prod-corte', false],
      ['Escova', '35,00', '', 'prod-escova', false],
      ['Coloração', '120,00', 'Valor varia com o comprimento', 'prod-coloracao', true],
    ],
    oferta: { titulo: 'Corte + escova', desconto: 'Combo da semana', de: '80,00', por: '60,00', limite: '15' },
    novidade: 'Agora abrimos aos sábados!',
  },
  'ze@tangua-teste.app': {
    tipo: 'autonomo',
    nome: 'Zé Eletricista',
    categoria: 'Casa e Construção',
    whatsapp: '21991110002',
    descricao: 'Eletricista com 15 anos de experiência. Instalação de tomadas, chuveiros, quadros de luz e manutenção. Vou até você em Tanguá e região. (perfil de demonstração)',
    bairro: 'Duques',
    area: 'Tanguá toda e Rio Bonito',
    capa: 'capa-ze',
    produtos: [
      ['Instalação de tomada', '40,00', 'Por ponto', 'prod-tomada', false],
      ['Troca de chuveiro', '90,00', '', 'prod-chuveiro', false],
    ],
    oferta: { titulo: 'Visita técnica grátis', desconto: 'Orçamento sem custo', limite: '10' },
    novidade: 'Agenda aberta pra próxima semana',
  },
  'padaria@tangua-teste.app': {
    tipo: 'estabelecimento',
    nome: 'Padaria Central',
    categoria: 'Alimentação',
    whatsapp: '21991110003',
    descricao: 'Pão quentinho toda manhã, bolos caseiros e salgados por encomenda. (perfil de demonstração)',
    bairro: 'Centro',
    endereco: 'Avenida Exemplo, 250',
    capa: 'capa-padaria',
    produtos: [
      ['Pão francês (kg)', '18,90', '', 'prod-pao', false],
      ['Bolo caseiro', '35,00', 'Sabores do dia', 'prod-bolo', true],
    ],
    oferta: { titulo: 'Pão de queijo', desconto: 'Leve 3 pague 2', limite: '' },
    novidade: 'Chegou o panetone artesanal',
  },
}

async function lojista(email) {
  const n = NEGOCIOS[email]
  console.log(`\n▶ Lojista ${n.nome}`)
  const { ctx, p } = await sessao(email)

  // cadastro do negócio
  await p.goto(`${BASE}/painel/negocio`)
  if (await p.getByText('Coloque seu negócio no app').count()) {
    await p.getByRole('link', { name: 'Cadastrar grátis' }).click()
    await p.waitForURL(/cadastrar/)
    if (n.tipo === 'autonomo') await p.getByText('Sou profissional autônomo').click()
    await p.fill('#nome', n.nome)
    await p.selectOption('#categoria_id', { label: n.categoria })
    await p.fill('#whatsapp', n.whatsapp)
    await p.fill('#descricao', n.descricao)
    await p.fill('#bairro', n.bairro)
    if (n.area) await p.fill('#area_atendimento', n.area)
    if (n.endereco && (await p.locator('#endereco').count())) await p.fill('#endereco', n.endereco)
    await foto(p, `${email}-01-cadastro-form`)
    await p.locator('form button[type=submit]').click()
    await p.waitForURL(/\/painel\/negocio(\?|$)/, { timeout: 30000 }).catch(() => {})
  }
  await esperarTexto(p, n.nome, 'negócio cadastrado e painel aberto')
  await esperarTexto(p, 'pronto', 'cartão "perfil X% pronto" no painel')
  await foto(p, `${email}-02-painel`)

  // perfil: capa, galeria, horário, pagamento
  await p.goto(`${BASE}/painel/negocio/perfil`)
  await p.setInputFiles('#foto_capa', IMG(n.capa))
  await p.setInputFiles('input[name=galeria_novas]', [IMG('galeria-1'), IMG('galeria-2')])
  for (const dia of ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']) {
    await p.getByRole('radio', { name: `${dia}: situação` }).first().waitFor({ timeout: 3000 }).catch(() => {})
    const grupo = p.getByRole('radiogroup', { name: `${dia}: situação` })
    if (await grupo.count()) await grupo.getByRole('radio', { name: 'Abre' }).click()
  }
  const dom = p.getByRole('radiogroup', { name: 'Domingo: situação' })
  if (await dom.count()) await dom.getByRole('radio', { name: 'Fechado' }).click()
  for (const forma of ['Pix', 'Cartão de débito']) {
    const caixa = p.locator(`input[name=formas_pagamento][value="${forma}"]`)
    if ((await caixa.count()) && !(await caixa.isChecked())) await caixa.locator('xpath=..').click()
  }
  await p.getByRole('button', { name: 'Salvar alterações' }).click()
  await esperarTexto(p, 'Dados salvos', 'perfil salvo com capa, galeria, horário e pagamento', 60000)
  await foto(p, `${email}-03-perfil`)

  // catálogo com fotos
  await p.goto(`${BASE}/painel/negocio/catalogo`)
  for (const [nome, preco, detalhe, img, aPartir] of n.produtos) {
    if (await p.getByText(nome, { exact: true }).count()) continue
    const form = p.locator('#novo form')
    await form.locator('input[name=foto]').setInputFiles(IMG(img))
    await form.locator('input[name=nome]').fill(nome)
    await form.locator('input[name=preco]').fill(preco)
    if (aPartir) await form.locator('input[name=preco_a_partir_de]').check()
    if (detalhe) await form.locator('textarea[name=descricao]').fill(detalhe)
    await form.getByRole('button', { name: 'Adicionar ao catálogo' }).click()
    await esperarTexto(p, nome, `produto "${nome}" no catálogo`, 30000)
  }
  // editar e arquivar/reativar o primeiro
  const primeiro = n.produtos[0][0]
  await p.getByRole('button', { name: `Arquivar ${primeiro}` }).click()
  await esperarTexto(p, 'arquivado', 'arquivar produto')
  await p.getByRole('button', { name: `Reativar ${primeiro}` }).click()
  await p.waitForTimeout(2500)
  ok('reativar produto')
  await foto(p, `${email}-04-catalogo`)

  // oferta
  await p.goto(`${BASE}/painel/negocio/ofertas`)
  if (!(await p.getByText(n.oferta.titulo).count())) {
    await p.fill('#cupom_titulo', n.oferta.titulo)
    await p.fill('#cupom_desconto', n.oferta.desconto)
    await p.getByRole('button', { name: /Mais opções/ }).click()
    if (n.oferta.limite && (await p.locator('#cupom_limite').isVisible().catch(() => false))) await p.fill('#cupom_limite', n.oferta.limite)
    if (n.oferta.de && (await p.locator('#cupom_preco_de').isVisible().catch(() => false))) {
      await p.fill('#cupom_preco_de', n.oferta.de)
      await p.fill('#cupom_preco_por', n.oferta.por)
    }
    await p.locator('#nova form button[type=submit]').click()
  }
  await esperarTexto(p, n.oferta.titulo, 'oferta publicada', 30000)
  await foto(p, `${email}-05-ofertas`)

  // novidade com foto
  await p.goto(`${BASE}/painel/negocio/novidades`)
  if (!(await p.getByText(n.novidade).count())) {
    await p.fill('#titulo-post', n.novidade)
    await p.fill('#conteudo-post', 'Publicação de demonstração do Tanguá App.')
    await p.setInputFiles('input[name=foto]', IMG('novidade'))
    await p.getByRole('button', { name: 'Publicar' }).click()
    await esperarTexto(p, 'Publicado!', 'novidade publicada com foto', 60000)
  } else ok('novidade já publicada')

  // telas que só leem
  for (const [rota, texto] of [
    ['/painel/negocio/divulgar', 'Cartaz pro balcão'],
    ['/painel/negocio/divulgar/cartaz', 'Aponte a câmera'],
    ['/painel/negocio/estatisticas', 'Visitas por dia'],
    ['/painel/negocio/equipe', 'Adicionar pessoa'],
    ['/painel/negocio/mais', 'Ver meu perfil como o cliente vê'],
    ['/painel/negocio/assinatura', 'Plano'],
    ['/painel/negocio/fidelidade', 'Cartão fidelidade'],
    ['/painel/negocio/vagas', 'Nova vaga'],
    ['/painel/negocio/avaliacoes', 'Avaliações'],
    ['/painel/negocio/orcamentos', 'Orçamentos'],
  ]) {
    await p.goto(BASE + rota)
    await esperarTexto(p, texto, `tela ${rota}`)
  }
  await foto(p, `${email}-06-orcamentos`)

  // perfil público como cliente vê
  await p.goto(`${BASE}/painel/negocio`)
  await foto(p, `${email}-07-painel-final`)
  const slug = await p.evaluate(() => document.querySelector('a[href^="/negocio/"]')?.getAttribute('href'))
  if (slug) estado[email] = { url: slug }
  salvarEstado()
  await ctx.close()
}


// ---------------------------------------------------------------- moradores
async function avaliar(p, nota, comentario, comFoto) {
  const form = p.locator('form').filter({ hasText: 'Deixe sua avaliação' })
  if (!(await form.count())) return ruim('formulário de avaliação não apareceu')
  await form.locator('button[type=button]').nth(nota - 1).click()
  await form.locator('#comentario').fill(comentario)
  if (comFoto) await form.locator('#foto-avaliacao').setInputFiles(IMG('avaliacao'))
  await form.getByRole('button', { name: 'Enviar avaliação' }).click()
  await esperarTexto(p, comentario.slice(0, 30), `avaliação ${nota} estrelas publicada`, 60000)
}

async function maria() {
  console.log('\n▶ Moradora Maria')
  const { ctx, p } = await sessao('maria@tangua-teste.app')
  await p.goto(BASE)
  await esperarTexto(p, 'Corte + escova', 'oferta aparece no Início')
  await foto(p, 'maria-01-inicio')

  await p.goto(`${BASE}/buscar?q=salão`)
  await esperarTexto(p, 'Salão da Ana', 'busca por "salão" encontra o negócio')
  await p.getByRole('link', { name: 'Com oferta' }).click()
  await esperarTexto(p, 'Salão da Ana', 'filtro "Com oferta"')
  await foto(p, 'maria-02-explorar')

  await p.goto(`${BASE}/ofertas`)
  await esperarTexto(p, 'Visita técnica grátis', 'tela Ofertas lista as ofertas')

  await p.goto(`${BASE}${estado['ana@tangua-teste.app'].url}?origem=busca`)
  await esperarTexto(p, 'Corte feminino', 'perfil mostra catálogo')
  await p.getByRole('button', { name: 'Favoritar' }).first().click()
  await p.waitForTimeout(2000)
  ok('favoritou o salão')
  await p.getByRole('button', { name: 'Salvar Corte feminino' }).click()
  await p.waitForTimeout(2000)
  ok('salvou produto')
  await p.getByRole('button', { name: 'Pegar meu cupom' }).click()
  await p.getByText('Seu código').waitFor({ timeout: 30000 })
  const codigo = (await p.locator('#oferta [role=status] .font-mono').first().innerText()).trim()
  estado.cupomMaria = codigo
  salvarEstado()
  ok(`pegou cupom ${codigo}`)
  const [popup] = await Promise.all([
    ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null),
    p.getByRole('link', { name: 'Chamar no WhatsApp' }).locator('visible=true').first().click(),
  ])
  if (popup) {
    ok(`botão WhatsApp abre ${new URL(popup.url()).host}`)
    await popup.close()
  } else ruim('botão WhatsApp não abriu')
  await avaliar(p, 5, 'Atendimento excelente, corte ficou lindo! (avaliação de demonstração)', true)
  await foto(p, 'maria-03-perfil-salao')

  await p.goto(`${BASE}${estado['ze@tangua-teste.app'].url}`)
  await p.getByRole('link', { name: 'Orçamento', exact: true }).click()
  await p.waitForURL(/orcamentos\/novo/)
  await p.fill('#titulo', 'Trocar 3 tomadas e 1 chuveiro')
  await p.fill('#descricao', 'Casa térrea no Centro. Pedido de demonstração do Tanguá App.')
  await p.fill('#bairro', 'Centro')
  await p.locator('form button[type=submit]').click()
  await p.waitForURL(/\/orcamentos\/[0-9a-f-]{36}/, { timeout: 30000 })
  estado.pedidoMaria = new URL(p.url()).pathname.split('/').pop()
  salvarEstado()
  await esperarTexto(p, 'Pedido enviado', 'pedido de orçamento enviado ao Zé')

  await p.goto(`${BASE}/agenda`)
  await p.getByRole('button', { name: /Tenho interesse/ }).first().click()
  await esperarTexto(p, 'Vou avisar você na véspera', 'interesse em evento salvo')
  await foto(p, 'maria-04-agenda')

  await p.goto(`${BASE}/perfil`)
  await p.locator('input[type=file]').first().setInputFiles(IMG('avatar'))
  await p.waitForTimeout(6000)
  ok('trocou foto de perfil')
  if (await p.getByRole('img', { name: /QR code do seu convite/ }).count()) ok('QR do "Indique um vizinho" aparece')
  else ruim('QR do "Indique um vizinho" não apareceu')
  await foto(p, 'maria-05-voce')
  await p.goto(`${BASE}/favoritos`)
  await esperarTexto(p, 'Salão da Ana', 'favoritos mostra o negócio')
  await esperarTexto(p, 'Corte feminino', 'favoritos mostra o produto salvo')
  await p.goto(`${BASE}/ofertas`)
  await esperarTexto(p, codigo, '"Seus cupons" mostra o código')
  await ctx.close()
}

async function joao() {
  console.log('\n▶ Morador João')
  const { ctx, p } = await sessao('joao@tangua-teste.app')
  await p.goto(`${BASE}/orcamentos`)
  await p.getByRole('link', { name: 'Pedir um orçamento' }).click()
  await p.waitForURL(/orcamentos\/novo/)
  await p.selectOption('#categoria_id', { label: 'Alimentação' })
  await p.locator('input[name=enviar_categoria]').check()
  await p.fill('#titulo', 'Bolo de aniversário para 30 pessoas')
  await p.fill('#descricao', 'Para sábado, sabor chocolate. Pedido de demonstração do Tanguá App.')
  await p.locator('form button[type=submit]').click()
  await p.waitForURL(/\/orcamentos\/[0-9a-f-]{36}/, { timeout: 30000 })
  estado.pedidoJoao = new URL(p.url()).pathname.split('/').pop()
  salvarEstado()
  await esperarTexto(p, 'Pedido enviado', 'pedido por categoria enviado')
  await p.goto(`${BASE}${estado['padaria@tangua-teste.app'].url}`)
  await avaliar(p, 4, 'Pão sempre fresquinho, só a fila que é grande de manhã. (avaliação de demonstração)', false)
  await ctx.close()
}

async function cadastroPelaTela() {
  console.log('\n▶ Cadastro novo pela tela')
  const { ctx, p } = await sessao(null)
  await p.goto(`${BASE}/cadastrar?origem=demo`)
  await p.fill('#nomeCompleto', 'Carla Teste')
  await p.fill('#email', `carla.${Date.now()}@tangua-teste.app`)
  await p.fill('#senha', `Tg-${Math.random().toString(36).slice(2)}A1`)
  await p.check('#aceite-termos')
  await p.getByRole('button', { name: 'Criar minha conta' }).click()
  try {
    await p.waitForURL(/confirme-seu-email/, { timeout: 30000 })
    ok('cadastro pela tela leva pra "confirme seu e-mail"')
  } catch {
    ruim(`cadastro não concluiu: ${(await p.innerText('form')).slice(0, 200)}`)
  }
  await ctx.close()
}

// ---------------------------------------------------------------- lojistas respondem
async function respostas() {
  console.log('\n▶ Lojistas respondem')
  {
    const { ctx, p } = await sessao('ana@tangua-teste.app')
    await p.goto(`${BASE}/painel/negocio/ofertas#validar`)
    await p.fill('#codigo-cupom', estado.cupomMaria)
    await p.getByRole('button', { name: 'Validar' }).click()
    await esperarTexto(p, 'Cupom válido', 'Ana valida o cupom da Maria no balcão')
    await p.fill('#codigo-cupom', estado.cupomMaria)
    await p.getByRole('button', { name: 'Validar' }).click()
    await esperarTexto(p, 'já foi usado', 'segundo uso do mesmo código é recusado')
    await p.goto(`${BASE}/painel/negocio/avaliacoes`)
    await p.getByRole('button', { name: 'Responder avaliação' }).first().click()
    await p.locator('textarea').first().fill('Obrigada, Maria! Volte sempre. (resposta de demonstração)')
    await p.getByRole('button', { name: 'Enviar resposta' }).click()
    await esperarTexto(p, 'Sua resposta', 'Ana responde a avaliação')
    await p.goto(`${BASE}/notificacoes`)
    await esperarTexto(p, 'Nova avaliação', 'Ana recebeu aviso da avaliação')
    await foto(p, 'ana-08-notificacoes')
    await ctx.close()
  }
  {
    const { ctx, p } = await sessao('ze@tangua-teste.app')
    await p.goto(`${BASE}/painel/negocio/orcamentos`)
    await esperarTexto(p, 'Trocar 3 tomadas', 'Zé vê o pedido da Maria')
    await p.goto(`${BASE}/painel/negocio/orcamentos/${estado.pedidoMaria}`)
    await p.getByRole('button', { name: /respostas prontas/ }).click()
    await p.getByLabel('Resposta pronta 1').fill('Atendo de segunda a sábado. Orçamento sem compromisso.')
    await p.getByRole('button', { name: 'Salvar respostas prontas' }).click()
    await p.waitForTimeout(3000)
    await p.getByRole('button', { name: /Atendo de segunda/ }).click()
    ok('resposta pronta salva e usada')
    await p.fill('input[name=valor]', '180,00')
    await p.fill('input[name=prazo]', '2 dias')
    await p.getByRole('button', { name: 'Enviar resposta' }).click()
    await esperarTexto(p, 'Resposta enviada', 'Zé responde com valor e prazo')
    await foto(p, 'ze-08-resposta')
    await ctx.close()
  }
  {
    const { ctx, p } = await sessao('padaria@tangua-teste.app')
    await p.goto(`${BASE}/painel/negocio/orcamentos/${estado.pedidoJoao}`)
    await p.fill('#mensagem', 'Fazemos sim! Bolo de chocolate pra 30 pessoas. (resposta de demonstração)')
    await p.fill('input[name=valor]', '150,00')
    await p.getByRole('button', { name: 'Enviar resposta' }).click()
    await esperarTexto(p, 'Resposta enviada', 'Padaria responde o pedido por categoria')
    await ctx.close()
  }
  {
    const { ctx, p } = await sessao('maria@tangua-teste.app')
    await p.goto(`${BASE}/notificacoes`)
    await esperarTexto(p, 'respondeu seu pedido', 'Maria recebe aviso da resposta')
    await p.goto(`${BASE}/orcamentos/${estado.pedidoMaria}`)
    await esperarTexto(p, 'R$', 'Maria vê o valor da resposta')
    await p.getByRole('button', { name: 'Fechei com este negócio' }).click()
    await esperarTexto(p, 'Você escolheu esta', 'Maria escolhe a resposta')
    await foto(p, 'maria-06-orcamento')
    await ctx.close()
  }
  {
    const { ctx, p } = await sessao('ze@tangua-teste.app')
    await p.goto(`${BASE}/notificacoes`)
    await esperarTexto(p, 'foi o escolhido', 'Zé é avisado que foi escolhido')
    await p.goto(`${BASE}/painel/negocio/orcamentos/${estado.pedidoMaria}`)
    await esperarTexto(p, 'visto pelo morador', 'Zé vê que a Maria leu a resposta')
    await ctx.close()
  }
}


async function escolher() {
  console.log('\n▶ Morador escolhe a resposta')
  {
    const { ctx, p } = await sessao('maria@tangua-teste.app')
    await p.goto(`${BASE}/orcamentos`)
    await esperarTexto(p, 'Trocar 3 tomadas', 'lista "Seus pedidos" mostra o pedido')
    await esperarTexto(p, '1 resposta', 'lista mostra quantas respostas chegaram')
    await p.goto(`${BASE}/orcamentos/${estado.pedidoMaria}`)
    await p.getByRole('button', { name: 'Fechei com este negócio' }).click()
    await esperarTexto(p, 'Você escolheu esta', 'Maria escolhe a resposta', 30000)
    await foto(p, 'maria-06-orcamento')
    await ctx.close()
  }
  {
    const { ctx, p } = await sessao('ze@tangua-teste.app')
    await p.goto(`${BASE}/notificacoes`)
    await esperarTexto(p, 'foi o escolhido', 'Zé é avisado que foi escolhido')
    await foto(p, 'ze-09-notificacoes')
    await ctx.close()
  }
}

const ETAPAS_EXTRAS = {
  escolher,
  moradores: async () => {
    await maria()
    await joao()
    await cadastroPelaTela()
  },
  joao: async () => {
    await joao()
    await cadastroPelaTela()
  },
  respostas,
}

// ---------------------------------------------------------------- execução
try {
  if (etapa === 'lojistas') {
    for (const email of Object.keys(NEGOCIOS)) {
      try {
        await lojista(email)
      } catch (e) {
        ruim(`${email}: ${e.message.split('\n')[0]}`)
      }
    }
  }
  if (ETAPAS_EXTRAS[etapa]) {
    try {
      await ETAPAS_EXTRAS[etapa]()
    } catch (e) {
      ruim(`${etapa}: ${e.message.split('\n')[0]}`)
    }
  }
} finally {
  await nav.close()
  console.log(`\n${falhas} falha(s)`)
}
