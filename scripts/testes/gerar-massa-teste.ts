/**
 * MASSA DE DADOS DE TESTE — TANGUÁ APP
 * =====================================
 * Roda localmente com: npx tsx scripts/testes/gerar-massa-teste.ts
 *
 * Cria, no MESMO banco de produção (não existe staging), 10 perfis
 * profissionais + 3 moradores usados pra testar e demonstrar cada recurso
 * do app. Todos claramente marcados como teste:
 *   - e-mail em @tangua-app-teste.dev (nunca recebe e-mail de verdade,
 *     as contas já nascem confirmadas via Admin API)
 *   - nome do negócio sempre prefixado com "[TESTE] "
 *   - descrição sempre inclui a frase de aviso padrão
 *
 * Pré-requisito: migration 0008_modalidade_atendimento.sql já aplicada.
 * Depois de rodar este script, rode aprovar-negocios-teste.ts pra
 * aprovar os cadastros (eles nascem "pendente", igual um cadastro real).
 *
 * Variáveis de ambiente necessárias (.env):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DOMINIO = 'tangua-app-teste.dev'
const AVISO_TESTE = 'Cadastro de teste gerado para validar o Tanguá App — não é um negócio real.'

type ModalidadeAtendimento = 'loja_fisica' | 'atende_em_casa' | 'atende_domicilio' | 'servico_digital'

interface DefinicaoProfissional {
  chave: string
  nome: string
  categoriaSlug: string
  bairro: string
  modalidades: ModalidadeAtendimento[]
  endereco?: string
  descricaoExtra: string
}

const PROFISSIONAIS: DefinicaoProfissional[] = [
  {
    chave: 'mercearia',
    nome: '[TESTE] Mercearia da Praça',
    categoriaSlug: 'alimentacao',
    bairro: 'Centro',
    modalidades: ['loja_fisica'],
    endereco: 'Rua da Praça, 120',
    descricaoExtra: 'Mercearia de bairro com produtos do dia a dia.',
  },
  {
    chave: 'salao',
    nome: '[TESTE] Salão da Ana',
    categoriaSlug: 'beleza-estetica',
    bairro: 'Centro',
    modalidades: ['loja_fisica'],
    endereco: 'Rua das Flores, 45',
    descricaoExtra: 'Cortes, escova e tratamentos capilares.',
  },
  {
    chave: 'oficina',
    nome: '[TESTE] Oficina do Zé',
    categoriaSlug: 'automotivo',
    bairro: 'Manilha',
    modalidades: ['loja_fisica'],
    endereco: 'Estrada de Manilha, 800',
    descricaoExtra: 'Mecânica geral, revisão e elétrica automotiva.',
  },
  {
    chave: 'cabeleireira-domiciliar',
    nome: '[TESTE] Cabeleireira Domiciliar Bia',
    categoriaSlug: 'beleza-estetica',
    bairro: 'Manilha',
    modalidades: ['atende_em_casa'],
    endereco: 'Rua das Acácias, 30',
    descricaoExtra: 'Atendimento na minha casa, combine antes pelo WhatsApp.',
  },
  {
    chave: 'terapeuta',
    nome: '[TESTE] Terapeuta Holística Lu',
    categoriaSlug: 'saude-bem-estar',
    bairro: 'Centro',
    modalidades: ['atende_em_casa'],
    endereco: 'Rua Nova, 12',
    descricaoExtra: 'Sessões de terapia holística e massoterapia.',
  },
  {
    chave: 'eletricista',
    nome: '[TESTE] Eletricista Marcão',
    categoriaSlug: 'casa-construcao',
    bairro: 'Zona Rural',
    modalidades: ['atende_domicilio'],
    descricaoExtra: 'Instalações e reparos elétricos, atendo toda a região.',
  },
  {
    chave: 'encanador',
    nome: '[TESTE] Encanador Pedro',
    categoriaSlug: 'casa-construcao',
    bairro: 'Centro',
    modalidades: ['atende_domicilio'],
    descricaoExtra: 'Reparos hidráulicos, desentupimento e instalações.',
  },
  {
    chave: 'diarista',
    nome: '[TESTE] Diarista Conceição',
    categoriaSlug: 'servicos-profissionais',
    bairro: 'Manilha',
    modalidades: ['atende_domicilio'],
    descricaoExtra: 'Faxina residencial e comercial, com referências.',
  },
  {
    chave: 'designer',
    nome: '[TESTE] Designer Freelancer Rafa',
    categoriaSlug: 'tecnologia',
    bairro: 'Zona Rural',
    modalidades: ['servico_digital'],
    descricaoExtra: 'Identidade visual, artes pra redes sociais — tudo remoto.',
  },
  {
    chave: 'professora',
    nome: '[TESTE] Aulas Particulares Online — Prof. Carla',
    categoriaSlug: 'educacao',
    bairro: 'Centro',
    modalidades: ['servico_digital'],
    descricaoExtra: 'Reforço escolar e inglês, aulas 100% online.',
  },
  // um negócio com DUAS modalidades ao mesmo tempo, de propósito
  {
    chave: 'salao-domicilio',
    nome: '[TESTE] Studio de Unhas Camila',
    categoriaSlug: 'beleza-estetica',
    bairro: 'Manilha',
    modalidades: ['loja_fisica', 'atende_domicilio'],
    endereco: 'Rua do Comércio, 210',
    descricaoExtra: 'Atendo no studio e também vou até você em pacotes fechados.',
  },
]

const MORADORES = [
  { chave: 'morador-centro', nome: '[TESTE] Morador Centro', bairro: 'Centro' },
  { chave: 'morador-manilha', nome: '[TESTE] Morador Manilha', bairro: 'Manilha' },
  { chave: 'morador-zona-rural', nome: '[TESTE] Morador Zona Rural', bairro: 'Zona Rural' },
]

async function criarUsuario(email: string, nomeCompleto: string, papel: 'morador' | 'profissional') {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'TanguaTeste!2026Aa',
    email_confirm: true,
    user_metadata: { nome_completo: nomeCompleto, papel },
  })
  if (error || !data.user) throw new Error(`Falha ao criar ${email}: ${error?.message}`)
  return data.user.id
}

async function main() {
  console.log('== Gerando massa de dados de teste do Tanguá App ==\n')

  const { data: categorias, error: erroCategorias } = await admin.from('categorias').select('id, slug')
  if (erroCategorias || !categorias) throw new Error(`Falha ao ler categorias: ${erroCategorias?.message}`)
  const idPorSlug = new Map(categorias.map((c) => [c.slug, c.id]))

  const manifesto: Record<string, unknown> = { profissionais: [], moradores: [], geradoEm: new Date().toISOString() }

  // --- Profissionais ---
  const idsNegocioPorChave = new Map<string, string>()
  for (const [i, p] of PROFISSIONAIS.entries()) {
    const email = `profissional${String(i + 1).padStart(2, '0')}.${p.chave}.teste@${DOMINIO}`
    const userId = await criarUsuario(email, p.nome.replace('[TESTE] ', ''), 'profissional')

    const categoriaId = idPorSlug.get(p.categoriaSlug)
    if (!categoriaId) throw new Error(`Categoria não encontrada: ${p.categoriaSlug}`)

    const { data: negocio, error } = await admin
      .from('negocios')
      .insert({
        nome: p.nome,
        categoria_id: categoriaId,
        descricao: `${p.descricaoExtra} ${AVISO_TESTE}`,
        endereco: p.endereco ?? null,
        bairro: p.bairro,
        whatsapp: `2199990${String(1000 + i).slice(-4)}`,
        modalidades_atendimento: p.modalidades,
        origem: 'cadastro_manual',
        status_cadastro: 'pendente',
        reivindicado_por: userId,
        reivindicado_em: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error || !negocio) throw new Error(`Falha ao criar negócio ${p.nome}: ${error?.message}`)
    idsNegocioPorChave.set(p.chave, negocio.id)
    ;(manifesto.profissionais as unknown[]).push({ email, userId, negocioId: negocio.id, nome: p.nome, modalidades: p.modalidades })
    console.log(`✔ ${p.nome} (${p.modalidades.join(', ')}) — ${email}`)
  }

  // --- Moradores ---
  const idsMoradorPorChave = new Map<string, string>()
  for (const m of MORADORES) {
    const email = `${m.chave}.teste@${DOMINIO}`
    const userId = await criarUsuario(email, m.nome.replace('[TESTE] ', ''), 'morador')
    await admin.from('perfis').update({ bairro: m.bairro }).eq('id', userId)
    idsMoradorPorChave.set(m.chave, userId)
    ;(manifesto.moradores as unknown[]).push({ email, userId, nome: m.nome, bairro: m.bairro })
    console.log(`✔ ${m.nome} — ${email}`)
  }

  // --- Favoritos cruzados (moradores de teste favoritam negócios de teste) ---
  const chavesNegocio = Array.from(idsNegocioPorChave.keys())
  let i = 0
  for (const moradorId of idsMoradorPorChave.values()) {
    const favoritas = [chavesNegocio[i % chavesNegocio.length], chavesNegocio[(i + 1) % chavesNegocio.length]]
    for (const chave of favoritas) {
      await admin.from('favoritos').insert({ perfil_id: moradorId, negocio_id: idsNegocioPorChave.get(chave) })
    }
    i += 2
  }
  console.log('✔ Favoritos cruzados criados')

  // --- Avaliações ---
  const notas = [5, 4, 5]
  let j = 0
  for (const moradorId of idsMoradorPorChave.values()) {
    const chave = chavesNegocio[j % chavesNegocio.length]
    await admin.from('avaliacoes').insert({
      negocio_id: idsNegocioPorChave.get(chave),
      autor_id: moradorId,
      nota: notas[j % notas.length],
      comentario: `Avaliação de teste E2E — ${AVISO_TESTE}`,
    })
    j++
  }
  console.log('✔ Avaliações de teste criadas')

  // --- Reivindicação de um negócio importado (se existir algum sem dono) ---
  const { data: negocioSemDono } = await admin
    .from('negocios')
    .select('id, nome')
    .eq('origem', 'importado')
    .is('reivindicado_por', null)
    .limit(1)
    .maybeSingle()

  if (negocioSemDono) {
    const primeiroMorador = Array.from(idsMoradorPorChave.values())[0]
    await admin.from('solicitacoes_reivindicacao').insert({
      negocio_id: negocioSemDono.id,
      solicitante_id: primeiroMorador,
      mensagem: `Solicitação de teste E2E — ${AVISO_TESTE}`,
    })
    console.log(`✔ Reivindicação de teste criada para "${negocioSemDono.nome}"`)
  } else {
    console.log('… nenhum negócio importado sem dono encontrado — pulei o teste de reivindicação')
  }

  writeFileSync(join(__dirname, 'massa-teste-gerada.json'), JSON.stringify(manifesto, null, 2))
  console.log('\nManifesto salvo em scripts/testes/massa-teste-gerada.json')
  console.log('\nPróximo passo: npx tsx scripts/testes/aprovar-negocios-teste.ts')
}

main().catch((err) => {
  console.error('\nFALHA:', err)
  process.exit(1)
})
