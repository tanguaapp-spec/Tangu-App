'use server'

import { cookies } from 'next/headers'
import { lerConfig } from '@/lib/config/ler'
import { lerFacebook } from '@/lib/ui/redes'
import { recursoLiberado } from '@/lib/planos/recursos'
import { COOKIE_NEGOCIO_ATIVO } from '@/lib/painel/negocio-atual'
import { traduzirErroBanco } from '@/lib/planos/limites'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { notificar } from '@/lib/notificacoes/notificar'
import { enviarImagem } from '@/lib/storage/imagens'
import { z } from 'zod'
import { lerPrecoCentavos } from '@/lib/admin/configuracoes'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { agendarLembreteAvaliacao } from '@/lib/avaliacoes/lembretes'
import { normalizarInstagram, normalizarSite, normalizarTelefoneBR } from '@/lib/utils'
import type { ModalidadeAtendimento } from '@/lib/types/database'

const MODALIDADES_VALIDAS = ['loja_fisica', 'atende_em_casa', 'atende_domicilio', 'servico_digital'] as const

const schemaCadastroNegocio = z.object({
  tipoPerfil: z.enum(['estabelecimento', 'autonomo']).catch('estabelecimento'),
  nome: z.string().trim().min(2, 'Nome muito curto.').max(120, 'Nome muito longo.'),
  categoriaId: z.string().uuid('Escolha uma categoria.'),
  descricao: z.string().trim().max(2000, 'Descrição muito longa (máximo 2000 caracteres).').optional(),
  endereco: z.string().trim().max(200).optional(),
  bairro: z.string().trim().max(100).optional(),
  areaAtendimento: z.string().trim().max(200).optional(),
  telefone: z.string().max(30).optional(),
  whatsapp: z.string().trim().min(1, 'Informe o WhatsApp com DDD.').max(30),
  instagram: z.string().max(80).optional(),
  site: z.string().max(200).optional(),
  modalidadesAtendimento: z
    .array(z.enum(MODALIDADES_VALIDAS))
    .min(1, 'Escolha ao menos uma forma de atendimento.'),
})

/** Normaliza contatos; devolve mensagem de erro amigável se algum for inválido. */
function normalizarContatos(bruto: {
  whatsapp?: string | null
  telefone?: string | null
  instagram?: string | null
  site?: string | null
}) {
  const whatsapp = bruto.whatsapp ? normalizarTelefoneBR(bruto.whatsapp) : null
  if (bruto.whatsapp && !whatsapp) return { erro: 'WhatsApp inválido. Use DDD + número, ex.: (21) 99999-9999.' }
  const telefone = bruto.telefone ? normalizarTelefoneBR(bruto.telefone) : null
  if (bruto.telefone && !telefone) return { erro: 'Telefone fixo inválido. Use DDD + número.' }
  const instagram = bruto.instagram ? normalizarInstagram(bruto.instagram) : null
  if (bruto.instagram && !instagram) return { erro: 'Instagram inválido. Informe só o @usuario.' }
  const site = bruto.site ? normalizarSite(bruto.site) : null
  if (bruto.site && !site) return { erro: 'Site inválido. Informe um endereço como seusite.com.br.' }
  return { whatsapp, telefone, instagram, site }
}

const schemaProduto = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do produto/serviço.').max(120, 'Nome muito longo.'),
  descricao: z.string().max(500).optional(),
  preco: z.number().nonnegative('Preço não pode ser negativo.').max(999999, 'Preço muito alto.').nullable(),
})

const schemaPost = z.object({
  titulo: z.string().trim().min(1, 'Informe um título.').max(120, 'Título muito longo.'),
  tipo: z.enum(['novidade', 'promocao', 'vaga_propria']),
  conteudo: z.string().max(2000).optional(),
})

const schemaCupom = z.object({
  titulo: z.string().trim().min(2, 'Dê um nome pra oferta.').max(120, 'Título muito longo.'),
  descontoTexto: z.string().trim().min(1, 'Descreva o desconto (ex: "20% off", "Leve 2 pague 1").').max(60),
  condicoes: z.string().trim().max(500, 'Condições muito longas (máximo 500 caracteres).').optional(),
  // ISO com fuso, convertido no navegador (datetime-local não tem fuso)
  iniciaEm: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data de início inválida.').optional(),
  expiraEm: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Escolha quando a oferta expira.'),
  limiteResgates: z.number().int().min(1, 'Limite precisa ser pelo menos 1.').max(100000).optional(),
  precoOriginal: z.number().int().positive().optional(),
  precoPromocional: z.number().int().nonnegative().optional(),
})

function centavos(valor: FormDataEntryValue | null): number | undefined {
  return String(valor ?? '').trim() ? lerPrecoCentavos(valor) : undefined
}

const schemaRespostaAvaliacao = z.object({
  resposta: z.string().trim().min(1, 'Escreva uma resposta.').max(1000, 'Resposta muito longa (máximo 1000 caracteres).'),
})

const schemaVaga = z.object({
  titulo: z.string().trim().min(2, 'Informe o título da vaga.').max(120),
  descricao: z.string().trim().min(10, 'Descreva a vaga com um pouco mais de detalhe.').max(3000),
  area: z.string().max(100).optional(),
  tipoContrato: z.string().max(60).optional(),
  salarioFaixa: z.string().max(60).optional(),
  bairro: z.string().max(100).optional(),
  contatoWhatsapp: z.string().max(30).optional(),
})

const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const

// ---------------------------------------------------------------------
// Autocadastro (profissional sem negócio ainda vindo do Google Places)
// ---------------------------------------------------------------------
export async function cadastrarNegocio(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para cadastrar um negócio.' }

  const texto = (campo: string) => ((formData.get(campo) as string) || '').trim() || undefined
  const validado = schemaCadastroNegocio.safeParse({
    tipoPerfil: formData.get('tipo_perfil'),
    nome: formData.get('nome') as string,
    categoriaId: formData.get('categoria_id') as string,
    descricao: texto('descricao'),
    endereco: texto('endereco'),
    bairro: texto('bairro'),
    areaAtendimento: texto('area_atendimento'),
    telefone: texto('telefone'),
    whatsapp: (formData.get('whatsapp') as string) ?? '',
    instagram: texto('instagram'),
    site: texto('site'),
    modalidadesAtendimento: formData.getAll('modalidades_atendimento').map(String),
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const dados = validado.data
  const contatos = normalizarContatos(dados)
  if ('erro' in contatos) return { erro: contatos.erro }

  if (!(await dentroDoLimite(`cadastro-negocio:${user.id}`, 5, 24 * 60 * 60))) {
    return { erro: 'Muitas tentativas de cadastro hoje. Tente de novo amanhã ou fale com o suporte.' }
  }

  // uma conta pode cuidar de vários negócios, até o limite do admin (o banco confere de novo)
  const { count: jaTem } = await supabase.from('negocios').select('id', { count: 'exact', head: true }).eq('reivindicado_por', user.id)
  const maximo = Number(await lerConfig('max_negocios_por_dono'))
  if ((jaTem ?? 0) >= maximo) {
    return { erro: `Esta conta já tem ${jaTem} negócios, o máximo permitido. Fale com o suporte se precisar de mais.` }
  }

  const autonomo = dados.tipoPerfil === 'autonomo'
  // status_cadastro é decidido pelo banco (trigger negocios_status_inicial,
  // migration 0017): aprovado na hora, ou pendente se alguma regra de risco disparar.
  const { data: negocio, error } = await supabase
    .from('negocios')
    .insert({
      tipo_perfil: dados.tipoPerfil,
      nome: dados.nome,
      categoria_id: dados.categoriaId,
      descricao: dados.descricao || null,
      endereco: autonomo ? null : dados.endereco || null,
      bairro: dados.bairro || null,
      area_atendimento: autonomo ? dados.areaAtendimento || null : null,
      telefone: contatos.telefone,
      whatsapp: contatos.whatsapp,
      instagram: contatos.instagram,
      site: contatos.site,
      modalidades_atendimento: dados.modalidadesAtendimento,
      origem: 'cadastro_manual',
      status_cadastro: 'pendente',
      reivindicado_por: user.id,
      reivindicado_em: new Date().toISOString(),
    })
    .select('id, status_cadastro')
    .single()

  if (error) {
    console.error('Falha ao cadastrar negócio:', error.message)
    return { erro: traduzirErroBanco(error) }
  }

  if (negocio.status_cadastro === 'pendente') {
    enviarNotificacaoParaAdmins({
      title: 'Cadastro sinalizado pra revisão',
      body: `${dados.nome} caiu numa regra automática e espera revisão.`,
      url: '/painel/admin/negocios-pendentes',
      tag: 'cadastro-pendente',
    }).catch((err) => console.error('Falha ao notificar admins:', err))
  }

  // o painel passa a mostrar o negócio recém-cadastrado
  cookies().set(COOKIE_NEGOCIO_ATIVO, negocio.id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/painel/negocio')
  revalidatePath('/buscar')
  return { erro: null, negocioId: negocio.id, status: negocio.status_cadastro }
}

// ---------------------------------------------------------------------
// Edição do perfil de negócio (dono)
// ---------------------------------------------------------------------
export async function atualizarNegocio(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const horarioFuncionamento: Record<string, string> = {}
  for (const dia of DIAS_SEMANA) {
    const valor = (formData.get(`horario_${dia}`) as string)?.trim().slice(0, 40)
    if (valor) horarioFuncionamento[dia] = valor
  }

  const formasPagamento = formData.getAll('formas_pagamento').map(String).filter(Boolean).slice(0, 10)

  const modalidadesEnviadas = formData.getAll('modalidades_atendimento').map(String)
  const modalidadesValidas = modalidadesEnviadas.filter((m): m is ModalidadeAtendimento =>
    (MODALIDADES_VALIDAS as readonly string[]).includes(m)
  )
  if (modalidadesValidas.length === 0) {
    return { erro: 'Escolha ao menos uma forma de atendimento.' }
  }

  const texto = (campo: string, max: number) => ((formData.get(campo) as string) || '').trim().slice(0, max) || null
  const nome = texto('nome', 120)
  if (!nome || nome.length < 2) return { erro: 'Informe o nome do negócio.' }
  const tipoPerfil = formData.get('tipo_perfil') === 'autonomo' ? 'autonomo' : 'estabelecimento'
  const categoriaId = texto('categoria_id', 36)
  if (categoriaId && !z.string().uuid().safeParse(categoriaId).success) return { erro: 'Categoria inválida.' }

  const contatos = normalizarContatos({
    whatsapp: texto('whatsapp', 30),
    telefone: texto('telefone', 30),
    instagram: texto('instagram', 80),
    site: texto('site', 200),
  })
  if ('erro' in contatos) return { erro: contatos.erro }

  const atualizacoes: Record<string, unknown> = {
    nome,
    tipo_perfil: tipoPerfil,
    categoria_id: categoriaId,
    descricao: texto('descricao', 2000),
    whatsapp: contatos.whatsapp,
    telefone: contatos.telefone,
    instagram: contatos.instagram,
    site: contatos.site,
    // autônomo nunca tem endereço público
    endereco: tipoPerfil === 'autonomo' ? null : texto('endereco', 200),
    area_atendimento: tipoPerfil === 'autonomo' ? texto('area_atendimento', 200) : null,
    bairro: texto('bairro', 100),
    horario_funcionamento: Object.keys(horarioFuncionamento).length ? horarioFuncionamento : null,
    formas_pagamento: formasPagamento.length ? formasPagamento : null,
    modalidades_atendimento: modalidadesValidas,
  }
  // campos da 0026 (só vêm do formulário novo)
  if (formData.has('facebook')) {
    const fb = lerFacebook(texto('facebook', 200))
    if (fb === false) return { erro: 'Facebook inválido. Informe o endereço da página (facebook.com/suapagina) ou só o nome dela.' }
    atualizacoes.facebook = fb
    atualizacoes.so_hora_marcada = formData.get('so_hora_marcada') === 'on'
  }

  const capa = formData.get('foto_capa') as File | null
  if (capa && capa.size > 0) {
    const { url, erro } = await enviarImagem(supabase, capa, `negocios/${negocioId}/capa`)
    if (erro) return { erro }
    if (url) atualizacoes.foto_capa_url = url
  }

  const novasFotos = formData.getAll('galeria_novas') as File[]
  const fotosValidas = novasFotos.filter((f) => f && f.size > 0).slice(0, 10)
  if (fotosValidas.length) {
    const { data: atual } = await supabase.from('negocios').select('galeria').eq('id', negocioId).single()
    const galeriaAtual: string[] = (atual?.galeria as string[]) ?? []
    const urlsNovas: string[] = []
    for (const foto of fotosValidas) {
      const { url, erro } = await enviarImagem(supabase, foto, `negocios/${negocioId}/galeria`)
      if (erro) return { erro }
      if (url) urlsNovas.push(url)
    }
    atualizacoes.galeria = [...galeriaAtual, ...urlsNovas]
  }

  const { error } = await supabase
    .from('negocios')
    .update(atualizacoes)
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) {
    console.error('Falha ao atualizar negócio:', error.message)
    return { erro: traduzirErroBanco(error) }
  }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function removerFotoGaleria(negocioId: string, url: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { data: negocio } = await supabase.from('negocios').select('galeria').eq('id', negocioId).single()
  const galeriaAtual: string[] = (negocio?.galeria as string[]) ?? []

  const { error } = await supabase
    .from('negocios')
    .update({ galeria: galeriaAtual.filter((g) => g !== url) })
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function reenviarCadastroNegocio(negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('negocios')
    .update({ status_cadastro: 'pendente' })
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)
    .eq('status_cadastro', 'rejeitado')

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  return { erro: null }
}

/** Pausar (férias, reforma) tira o perfil das buscas sem apagar nada; reativar volta na hora. Só o dono. */
export async function alternarNegocioAtivo(negocioId: string, valor: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('negocios')
    .update({ ativo: valor, pausado_em: valor ? null : new Date().toISOString() })
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

// ---------------------------------------------------------------------
// Posts / novidades
// ---------------------------------------------------------------------
export async function criarPost(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const validado = schemaPost.safeParse({
    titulo: formData.get('titulo') as string,
    tipo: formData.get('tipo') as string,
    conteudo: (formData.get('conteudo') as string) || undefined,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const { titulo, tipo, conteudo } = validado.data

  let imagemUrl: string | null = null
  const foto = formData.get('foto')
  if (foto instanceof File && foto.size > 0) {
    const r = await enviarImagem(supabase, foto, `negocios/${negocioId}/novidades`)
    if (r.erro) return { erro: r.erro }
    imagemUrl = r.url ?? null
  }

  const { error } = await supabase.from('posts_negocio').insert({
    negocio_id: negocioId,
    autor_id: user.id,
    tipo,
    titulo,
    conteudo: conteudo || null,
    imagem_url: imagemUrl,
  })

  if (error) return { erro: traduzirErroBanco(error) }

  // avisa quem favoritou o negócio
  const [{ data: negocio }, { data: favoritos }] = await Promise.all([
    supabase.from('negocios').select('nome').eq('id', negocioId).single(),
    supabase.from('favoritos').select('perfil_id').eq('negocio_id', negocioId),
  ])
  if (negocio && favoritos && favoritos.length > 0) {
    await notificar(
      favoritos.map((f) => f.perfil_id),
      {
        tipo: 'novidade',
        titulo: negocio.nome,
        corpo: `${tipo === 'promocao' ? 'Nova promoção' : 'Novidade'}: ${titulo}`,
        url: `/negocio/${negocioId}`,
      },
      { categoria: 'novidades_favoritos' }
    )
  }

  revalidatePath('/painel/negocio/novidades')
  revalidatePath('/negocio/[id]', 'page')
  return { erro: null }
}

/** Tirar uma novidade do perfil (arquivar) ou trazer de volta. */
export async function alternarPostAtivo(postId: string, ativo: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }
  const { error } = await supabase.from('posts_negocio').update({ ativo }).eq('id', postId)
  if (error) return { erro: traduzirErroBanco(error) }
  revalidatePath('/painel/negocio/novidades')
  revalidatePath('/negocio/[id]', 'page')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Catálogo de produtos/serviços com preço
// ---------------------------------------------------------------------
function lerPrecoProduto(bruto: FormDataEntryValue | null): { preco: number | null; erro?: string } {
  if (!String(bruto ?? '').trim()) return { preco: null }
  const centavos = lerPrecoCentavos(bruto)
  if (Number.isNaN(centavos)) return { preco: null, erro: 'Preço inválido. Use só números, ex: 35,00' }
  return { preco: centavos / 100 }
}

function revalidarCatalogo() {
  revalidatePath('/painel/negocio/catalogo')
  revalidatePath('/negocio/[id]', 'page')
}

/** Duração do serviço na agenda (5 a 600 min, de 5 em 5); vazio ou inválido = sem duração. */
function lerDuracao(bruto: FormDataEntryValue | null) {
  const n = Math.round(Number(String(bruto ?? '').trim()) / 5) * 5
  return Number.isFinite(n) && n >= 5 && n <= 600 ? n : null
}

export async function criarProduto(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const preco = lerPrecoProduto(formData.get('preco'))
  if (preco.erro) return { erro: preco.erro }

  const validado = schemaProduto.safeParse({
    nome: formData.get('nome') as string,
    descricao: (formData.get('descricao') as string) || undefined,
    preco: preco.preco,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  let imagemUrl: string | null = null
  const foto = formData.get('foto')
  if (foto instanceof File && foto.size > 0) {
    const r = await enviarImagem(supabase, foto, `negocios/${negocioId}/produtos`)
    if (r.erro) return { erro: r.erro }
    imagemUrl = r.url ?? null
  }

  const { error } = await supabase.from('produtos_servicos').insert({
    negocio_id: negocioId,
    nome: validado.data.nome,
    descricao: validado.data.descricao || null,
    preco: validado.data.preco,
    preco_a_partir_de: formData.get('preco_a_partir_de') === 'on',
    imagem_url: imagemUrl,
    duracao_min: lerDuracao(formData.get('duracao_min')),
  })

  if (error) return { erro: traduzirErroBanco(error) }
  revalidarCatalogo()
  return { erro: null }
}

/** Editar nome, preço, detalhes e foto de um item do catálogo. */
export async function atualizarProduto(produtoId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }
  const { data: atual } = await supabase.from('produtos_servicos').select('negocio_id').eq('id', produtoId).maybeSingle()
  if (!atual) return { erro: 'Item não encontrado.' }

  const preco = lerPrecoProduto(formData.get('preco'))
  if (preco.erro) return { erro: preco.erro }
  const validado = schemaProduto.safeParse({
    nome: formData.get('nome') as string,
    descricao: (formData.get('descricao') as string) || undefined,
    preco: preco.preco,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  const dados: Record<string, unknown> = {
    nome: validado.data.nome,
    descricao: validado.data.descricao || null,
    preco: validado.data.preco,
    preco_a_partir_de: formData.get('preco_a_partir_de') === 'on',
    duracao_min: lerDuracao(formData.get('duracao_min')),
  }
  const foto = formData.get('foto')
  if (foto instanceof File && foto.size > 0) {
    const r = await enviarImagem(supabase, foto, `negocios/${atual.negocio_id}/produtos`)
    if (r.erro) return { erro: r.erro }
    dados.imagem_url = r.url ?? null
  } else if (formData.get('remover_foto') === 'on') {
    dados.imagem_url = null
  }

  const { error } = await supabase.from('produtos_servicos').update(dados).eq('id', produtoId)
  if (error) return { erro: traduzirErroBanco(error) }
  revalidarCatalogo()
  return { erro: null }
}

/** Arquivar (some do perfil, não conta no limite do plano) ou reativar. */
export async function alternarProdutoAtivo(produtoId: string, ativo: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }
  const { error } = await supabase.from('produtos_servicos').update({ ativo }).eq('id', produtoId)
  if (error) return { erro: traduzirErroBanco(error) }
  revalidarCatalogo()
  return { erro: null }
}

export async function removerProduto(produtoId: string, _negocioId?: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase.from('produtos_servicos').delete().eq('id', produtoId)
  if (error) return { erro: traduzirErroBanco(error) }
  revalidarCatalogo()
  return { erro: null }
}

// ---------------------------------------------------------------------
// Vagas publicadas pelo próprio profissional
// ---------------------------------------------------------------------
export async function criarVagaProfissional(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('nome, bairro')
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)
    .single()

  if (!negocio) return { erro: 'Negócio não encontrado.' }

  const validado = schemaVaga.safeParse({
    titulo: formData.get('titulo') as string,
    descricao: formData.get('descricao') as string,
    area: (formData.get('area') as string) || undefined,
    tipoContrato: (formData.get('tipo_contrato') as string) || undefined,
    salarioFaixa: (formData.get('salario_faixa') as string) || undefined,
    bairro: (formData.get('bairro') as string) || undefined,
    contatoWhatsapp: (formData.get('contato_whatsapp') as string) || undefined,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const dadosVaga = validado.data

  const { error } = await supabase.from('vagas').insert({
    titulo: dadosVaga.titulo,
    empresa_nome: negocio.nome,
    negocio_id: negocioId,
    descricao: dadosVaga.descricao,
    area: dadosVaga.area || null,
    tipo_contrato: dadosVaga.tipoContrato || null,
    salario_faixa: dadosVaga.salarioFaixa || null,
    bairro: dadosVaga.bairro || negocio.bairro,
    contato_whatsapp: dadosVaga.contatoWhatsapp || null,
    publicado_por: user.id,
  })

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath('/vagas')
  return { erro: null }
}

export async function encerrarVagaPropria(vagaId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('vagas')
    .update({ status: 'encerrada' })
    .eq('id', vagaId)
    .eq('publicado_por', user.id)

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath('/vagas')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Cupons (oferta relâmpago)
// ---------------------------------------------------------------------
export async function criarCupom(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const limite = String(formData.get('limite_resgates') ?? '').trim()
  const validado = schemaCupom.safeParse({
    titulo: formData.get('titulo') as string,
    descontoTexto: formData.get('desconto_texto') as string,
    condicoes: ((formData.get('condicoes') as string) || '').trim() || undefined,
    iniciaEm: (formData.get('inicia_em_iso') as string) || undefined,
    expiraEm: (formData.get('expira_em_iso') as string) || (formData.get('expira_em') as string),
    limiteResgates: limite ? Number(limite) : undefined,
    precoOriginal: centavos(formData.get('preco_original')),
    precoPromocional: centavos(formData.get('preco_promocional')),
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const dados = validado.data

  const inicio = dados.iniciaEm ? new Date(dados.iniciaEm) : new Date()
  if (new Date(dados.expiraEm).getTime() <= Math.max(Date.now(), inicio.getTime())) {
    return { erro: 'O fim da oferta precisa ser depois do início (e no futuro).' }
  }
  if ((dados.precoOriginal === undefined) !== (dados.precoPromocional === undefined)) {
    return { erro: 'Pra mostrar "de/por", preencha os dois preços — ou deixe os dois em branco.' }
  }
  if (dados.precoOriginal !== undefined && dados.precoPromocional !== undefined && dados.precoPromocional >= dados.precoOriginal) {
    return { erro: 'O preço promocional precisa ser menor que o preço normal.' }
  }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nome')
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)
    .single()
  if (!negocio) return { erro: 'Negócio não encontrado.' }

  const { error } = await supabase.from('cupons').insert({
    negocio_id: negocioId,
    titulo: dados.titulo,
    desconto_texto: dados.descontoTexto,
    condicoes: dados.condicoes ?? null,
    inicia_em: inicio.toISOString(),
    expira_em: new Date(dados.expiraEm).toISOString(),
    limite_resgates: dados.limiteResgates ?? null,
    preco_original_centavos: dados.precoOriginal ?? null,
    preco_promocional_centavos: dados.precoPromocional ?? null,
  })
  if (error) return { erro: traduzirErroBanco(error) }

  // avisa quem favoritou — escassez real, então vale a pena notificar
  const { data: favoritos } = await supabase.from('favoritos').select('perfil_id').eq('negocio_id', negocioId)
  if (favoritos && favoritos.length > 0) {
    await notificar(
      favoritos.map((f) => f.perfil_id),
      {
        tipo: 'oferta',
        titulo: `Oferta: ${negocio.nome}`,
        corpo: `${dados.titulo} — ${dados.descontoTexto}`,
        url: `/negocio/${negocioId}`,
      },
      { categoria: 'ofertas_favoritos' }
    )
  }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function encerrarCupom(cupomId: string, negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase.from('cupons').update({ ativo: false }).eq('id', cupomId)
  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

// ---------------------------------------------------------------------
// Cartão fidelidade digital (carimbo) — só pra clientes que já
// favoritaram ou avaliaram o negócio, pra não virar ferramenta de
// procurar qualquer perfil ao acaso.
// ---------------------------------------------------------------------
export async function adicionarCarimbo(negocioId: string, perfilId: string) {
  if (!(await recursoLiberado(negocioId, 'fidelidade'))) return { erro: 'Seu plano não inclui o cartão fidelidade.' }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)
    .single()
  if (!negocio) return { erro: 'Negócio não encontrado.' }

  const [{ data: favorito }, { data: avaliacao }] = await Promise.all([
    supabase.from('favoritos').select('perfil_id').eq('negocio_id', negocioId).eq('perfil_id', perfilId).maybeSingle(),
    supabase.from('avaliacoes').select('autor_id').eq('negocio_id', negocioId).eq('autor_id', perfilId).maybeSingle(),
  ])
  if (!favorito && !avaliacao) return { erro: 'Esse cliente ainda não interagiu com seu perfil.' }

  const admin = createServiceClient()
  const { data: cartaoAtual } = await admin
    .from('cartoes_fidelidade')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('perfil_id', perfilId)
    .maybeSingle()

  if (cartaoAtual) {
    if (cartaoAtual.carimbos >= cartaoAtual.meta) {
      return { erro: 'Esse cartão já está completo — confirme o resgate antes de carimbar de novo.' }
    }
    const { error } = await admin
      .from('cartoes_fidelidade')
      .update({ carimbos: cartaoAtual.carimbos + 1, atualizado_em: new Date().toISOString() })
      .eq('id', cartaoAtual.id)
    if (error) return { erro: traduzirErroBanco(error) }
  } else {
    const { error } = await admin.from('cartoes_fidelidade').insert({ negocio_id: negocioId, perfil_id: perfilId, carimbos: 1 })
    if (error) return { erro: traduzirErroBanco(error) }
  }

  revalidatePath('/painel/negocio')
  return { erro: null }
}

export async function confirmarResgateFidelidade(negocioId: string, perfilId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)
    .single()
  if (!negocio) return { erro: 'Negócio não encontrado.' }

  const admin = createServiceClient()
  const { data: cartao } = await admin
    .from('cartoes_fidelidade')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('perfil_id', perfilId)
    .maybeSingle()
  if (!cartao || cartao.carimbos < cartao.meta) return { erro: 'Esse cartão ainda não está completo.' }

  const { error } = await admin
    .from('cartoes_fidelidade')
    .update({ carimbos: 0, completos: cartao.completos + 1, atualizado_em: new Date().toISOString() })
    .eq('id', cartao.id)
  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Resposta do dono a uma avaliação
// ---------------------------------------------------------------------
export async function responderAvaliacao(avaliacaoId: string, resposta: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const validado = schemaRespostaAvaliacao.safeParse({ resposta })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  const { data: avaliacao } = await supabase
    .from('avaliacoes')
    .select('negocio_id, negocio:negocios(reivindicado_por)')
    .eq('id', avaliacaoId)
    .single()

  const dono = (avaliacao?.negocio as unknown as { reivindicado_por: string } | null)?.reivindicado_por
  if (!avaliacao || dono !== user.id) return { erro: 'Você não pode responder essa avaliação.' }

  const { error } = await supabase
    .from('avaliacoes')
    .update({ resposta_profissional: validado.data.resposta, respondido_em: new Date().toISOString() })
    .eq('id', avaliacaoId)

  if (error) return { erro: traduzirErroBanco(error) }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${avaliacao.negocio_id}`)
  return { erro: null }
}

/** Dono confirma no balcão o código que o cliente mostrou. Uso único. */
export async function validarCodigoCupom(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const codigo = String(formData.get('codigo') ?? '').trim().toUpperCase()
  if (!/^[A-Z0-9]{6,12}$/.test(codigo)) return { erro: 'Código inválido. Confira as letras e números.' }
  if (!(await dentroDoLimite(`validar-cupom:${user.id}`, 60, 60 * 60))) return { erro: 'Muitas tentativas. Aguarde um pouco.' }

  const { data, error } = await supabase.rpc('validar_codigo_cupom', { p_codigo: codigo })
  if (error) return { erro: traduzirErroBanco(error) }
  const r = data as { resultado: string; titulo?: string; desconto?: string; usado_em?: string }
  if (r.resultado === 'ok') {
    // 2 dias depois, pergunta pro cliente como foi (se ainda não avaliou)
    const { data: resgate } = await supabase.from('cupom_resgates').select('perfil_id, cupom:cupons(negocio_id)').eq('codigo', codigo).maybeSingle()
    const negocioId = (resgate?.cupom as { negocio_id?: string } | null)?.negocio_id
    if (resgate?.perfil_id && negocioId) await agendarLembreteAvaliacao(resgate.perfil_id, negocioId, 'cupom')
    return { erro: null, mensagem: `Cupom válido: ${r.titulo} — ${r.desconto}. Marcado como usado.` }
  }
  if (r.resultado === 'ja_usado') {
    return { erro: `Esse código já foi usado em ${new Date(r.usado_em!).toLocaleString('pt-BR')}.` }
  }
  return { erro: 'Código não encontrado entre os cupons do seu negócio.' }
}
