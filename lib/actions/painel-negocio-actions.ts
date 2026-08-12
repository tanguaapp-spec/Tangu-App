'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { enviarNotificacaoParaPerfis, enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { z } from 'zod'
import type { ModalidadeAtendimento } from '@/lib/types/database'

const MODALIDADES_VALIDAS = ['loja_fisica', 'atende_em_casa', 'atende_domicilio', 'servico_digital'] as const

const schemaCadastroNegocio = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto.').max(120, 'Nome muito longo.'),
  categoriaId: z.string().uuid('Escolha uma categoria.'),
  descricao: z.string().max(2000).optional(),
  endereco: z.string().max(200).optional(),
  bairro: z.string().max(100).optional(),
  telefone: z.string().max(30).optional(),
  whatsapp: z.string().trim().min(8, 'Informe um WhatsApp válido.').max(30),
  instagram: z.string().max(60).optional(),
  site: z.string().max(200).optional(),
  modalidadesAtendimento: z
    .array(z.enum(MODALIDADES_VALIDAS))
    .min(1, 'Escolha ao menos uma forma de atendimento.'),
})

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
const TAMANHO_MAX_IMAGEM = 5 * 1024 * 1024 // 5MB

function extensaoDoArquivo(arquivo: File) {
  const partes = arquivo.name.split('.')
  const ext = partes.length > 1 ? partes.pop() : null
  return (ext || arquivo.type.split('/')[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function enviarImagem(
  supabase: ReturnType<typeof createClient>,
  arquivo: File,
  caminho: string
): Promise<{ url?: string; erro?: string }> {
  if (!arquivo || arquivo.size === 0) return {}
  if (!arquivo.type.startsWith('image/')) return { erro: 'Envie apenas arquivos de imagem.' }
  if (arquivo.size > TAMANHO_MAX_IMAGEM) return { erro: 'Cada imagem deve ter no máximo 5MB.' }

  const { error } = await supabase.storage.from('imagens').upload(caminho, arquivo, {
    upsert: true,
    contentType: arquivo.type,
  })
  if (error) return { erro: error.message }

  const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
  return { url: data.publicUrl }
}

// ---------------------------------------------------------------------
// Autocadastro (profissional sem negócio ainda vindo do Google Places)
// ---------------------------------------------------------------------
export async function cadastrarNegocio(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Você precisa entrar para cadastrar um negócio.' }

  const validado = schemaCadastroNegocio.safeParse({
    nome: formData.get('nome') as string,
    categoriaId: formData.get('categoria_id') as string,
    descricao: (formData.get('descricao') as string) || undefined,
    endereco: (formData.get('endereco') as string) || undefined,
    bairro: (formData.get('bairro') as string) || undefined,
    telefone: (formData.get('telefone') as string) || undefined,
    whatsapp: formData.get('whatsapp') as string,
    instagram: (formData.get('instagram') as string) || undefined,
    site: (formData.get('site') as string) || undefined,
    modalidadesAtendimento: formData.getAll('modalidades_atendimento').map(String),
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const dados = validado.data

  const { data: existente } = await supabase
    .from('negocios')
    .select('id')
    .eq('reivindicado_por', user.id)
    .maybeSingle()

  if (existente) {
    return { erro: 'Você já tem um negócio cadastrado neste perfil.' }
  }

  const { data: negocio, error } = await supabase
    .from('negocios')
    .insert({
      nome: dados.nome,
      categoria_id: dados.categoriaId,
      descricao: dados.descricao || null,
      endereco: dados.endereco || null,
      bairro: dados.bairro || null,
      telefone: dados.telefone || null,
      whatsapp: dados.whatsapp,
      instagram: dados.instagram || null,
      site: dados.site || null,
      modalidades_atendimento: dados.modalidadesAtendimento,
      origem: 'cadastro_manual',
      status_cadastro: 'pendente',
      reivindicado_por: user.id,
      reivindicado_em: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return { erro: error.message }

  // Quem cadastra um negócio passa a ser profissional (se ainda não for).
  await supabase.from('perfis').update({ papel: 'profissional' }).eq('id', user.id).neq('papel', 'admin')

  enviarNotificacaoParaAdmins({
    title: 'Novo cadastro pra revisar',
    body: `${dados.nome} acabou de se cadastrar e está esperando aprovação.`,
    url: '/painel/admin/negocios-pendentes',
    tag: 'cadastro-pendente',
  }).catch((err) => console.error('Falha ao notificar admins:', err))

  revalidatePath('/painel/negocio')
  return { erro: null, negocioId: negocio.id }
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
    const valor = (formData.get(`horario_${dia}`) as string)?.trim()
    if (valor) horarioFuncionamento[dia] = valor
  }

  const formasPagamento = formData.getAll('formas_pagamento').map(String).filter(Boolean)

  const modalidadesEnviadas = formData.getAll('modalidades_atendimento').map(String)
  const modalidadesValidas = modalidadesEnviadas.filter((m): m is ModalidadeAtendimento =>
    (MODALIDADES_VALIDAS as readonly string[]).includes(m)
  )
  if (modalidadesValidas.length === 0) {
    return { erro: 'Escolha ao menos uma forma de atendimento.' }
  }

  const atualizacoes: Record<string, unknown> = {
    nome: (formData.get('nome') as string)?.trim() || undefined,
    categoria_id: (formData.get('categoria_id') as string) || null,
    descricao: (formData.get('descricao') as string) || null,
    whatsapp: (formData.get('whatsapp') as string) || null,
    telefone: (formData.get('telefone') as string) || null,
    instagram: (formData.get('instagram') as string) || null,
    site: (formData.get('site') as string) || null,
    endereco: (formData.get('endereco') as string) || null,
    bairro: (formData.get('bairro') as string) || null,
    horario_funcionamento: Object.keys(horarioFuncionamento).length ? horarioFuncionamento : null,
    formas_pagamento: formasPagamento.length ? formasPagamento : null,
    modalidades_atendimento: modalidadesValidas,
  }

  const capa = formData.get('foto_capa') as File | null
  if (capa && capa.size > 0) {
    const { url, erro } = await enviarImagem(supabase, capa, `negocios/${negocioId}/capa-${Date.now()}.${extensaoDoArquivo(capa)}`)
    if (erro) return { erro }
    if (url) atualizacoes.foto_capa_url = url
  }

  const novasFotos = formData.getAll('galeria_novas') as File[]
  const fotosValidas = novasFotos.filter((f) => f && f.size > 0)
  if (fotosValidas.length) {
    const { data: atual } = await supabase.from('negocios').select('galeria').eq('id', negocioId).single()
    const galeriaAtual: string[] = (atual?.galeria as string[]) ?? []
    const urlsNovas: string[] = []
    for (const [i, foto] of fotosValidas.entries()) {
      const { url, erro } = await enviarImagem(
        supabase,
        foto,
        `negocios/${negocioId}/galeria-${Date.now()}-${i}.${extensaoDoArquivo(foto)}`
      )
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

  if (error) return { erro: error.message }

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

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function alternarAbertoAgora(negocioId: string, valor: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('negocios')
    .update({ aberto_agora: valor })
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) return { erro: error.message }

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

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  return { erro: null }
}

export async function alternarNegocioAtivo(negocioId: string, valor: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase
    .from('negocios')
    .update({ ativo: valor })
    .eq('id', negocioId)
    .eq('reivindicado_por', user.id)

  if (error) return { erro: error.message }

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

  const { error } = await supabase.from('posts_negocio').insert({
    negocio_id: negocioId,
    autor_id: user.id,
    tipo,
    titulo,
    conteudo: conteudo || null,
  })

  if (error) return { erro: error.message }

  // avisa quem favoritou o negócio
  const [{ data: negocio }, { data: favoritos }] = await Promise.all([
    supabase.from('negocios').select('nome').eq('id', negocioId).single(),
    supabase.from('favoritos').select('perfil_id').eq('negocio_id', negocioId),
  ])
  if (negocio && favoritos && favoritos.length > 0) {
    enviarNotificacaoParaPerfis(
      favoritos.map((f) => f.perfil_id),
      {
        title: negocio.nome,
        body: `${tipo === 'promocao' ? 'Nova promoção' : 'Novidade'}: ${titulo}`,
        url: `/negocio/${negocioId}`,
        tag: `post-${negocioId}`,
      }
    ).catch((err) => console.error('Falha ao notificar favoritos:', err))
  }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

// ---------------------------------------------------------------------
// Catálogo de produtos/serviços com preço
// ---------------------------------------------------------------------
export async function criarProduto(negocioId: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const precoStr = (formData.get('preco') as string)?.replace(',', '.').trim()
  const precoNumero = precoStr ? Number(precoStr) : null
  if (precoStr && Number.isNaN(precoNumero)) return { erro: 'Preço inválido.' }

  const validado = schemaProduto.safeParse({
    nome: formData.get('nome') as string,
    descricao: (formData.get('descricao') as string) || undefined,
    preco: precoNumero,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  const { error } = await supabase.from('produtos_servicos').insert({
    negocio_id: negocioId,
    nome: validado.data.nome,
    descricao: validado.data.descricao || null,
    preco: validado.data.preco,
    preco_a_partir_de: formData.get('preco_a_partir_de') === 'on',
  })

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
  return { erro: null }
}

export async function removerProduto(produtoId: string, negocioId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await supabase.from('produtos_servicos').delete().eq('id', produtoId)

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath(`/negocio/${negocioId}`)
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

  if (error) return { erro: error.message }

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

  if (error) return { erro: error.message }

  revalidatePath('/painel/negocio')
  revalidatePath('/vagas')
  return { erro: null }
}
