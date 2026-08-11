'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const nome = (formData.get('nome') as string)?.trim()
  const categoriaId = (formData.get('categoria_id') as string) || null
  if (!nome) return { erro: 'Informe o nome do negócio.' }
  if (!categoriaId) return { erro: 'Escolha uma categoria.' }

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
      nome,
      categoria_id: categoriaId,
      descricao: (formData.get('descricao') as string) || null,
      endereco: (formData.get('endereco') as string) || null,
      bairro: (formData.get('bairro') as string) || null,
      telefone: (formData.get('telefone') as string) || null,
      whatsapp: (formData.get('whatsapp') as string) || null,
      instagram: (formData.get('instagram') as string) || null,
      site: (formData.get('site') as string) || null,
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

  const { error } = await supabase.from('posts_negocio').insert({
    negocio_id: negocioId,
    autor_id: user.id,
    tipo: formData.get('tipo') as string,
    titulo: formData.get('titulo') as string,
    conteudo: formData.get('conteudo') as string,
  })

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

  const { error } = await supabase.from('vagas').insert({
    titulo: formData.get('titulo') as string,
    empresa_nome: negocio.nome,
    negocio_id: negocioId,
    descricao: formData.get('descricao') as string,
    area: (formData.get('area') as string) || null,
    tipo_contrato: (formData.get('tipo_contrato') as string) || null,
    salario_faixa: (formData.get('salario_faixa') as string) || null,
    bairro: (formData.get('bairro') as string) || negocio.bairro,
    contato_whatsapp: (formData.get('contato_whatsapp') as string) || null,
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
