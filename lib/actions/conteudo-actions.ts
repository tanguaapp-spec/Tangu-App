'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { enviarImagem } from '@/lib/storage/imagens'
import { slugNoticia } from '@/lib/conteudo/rss'
import { urlSegura } from '@/lib/utils'

async function usuarioLogado() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

// ---------------------------------------------------------------------
// Moradores: sugerir notícia e evento (vão para revisão do admin)
// ---------------------------------------------------------------------
const schemaSugestaoNoticia = z.object({
  titulo: z.string().trim().min(10, 'Escreva um título com pelo menos 10 letras.').max(160),
  corpo: z.string().trim().min(30, 'Conte um pouco mais (pelo menos 30 letras).').max(4000),
  contato: z.string().trim().max(120).optional(),
})

export async function sugerirNoticia(formData: FormData) {
  const user = await usuarioLogado()
  if (!user) return { erro: 'Entre na sua conta para sugerir uma notícia.' }
  if (!(await dentroDoLimite(`sugerir-noticia:${user.id}`, 3, 86400))) return { erro: 'Você já mandou 3 sugestões hoje. Obrigado!' }
  const v = schemaSugestaoNoticia.safeParse({
    titulo: formData.get('titulo'),
    corpo: formData.get('corpo'),
    contato: formData.get('contato') || undefined,
  })
  if (!v.success) return { erro: v.error.issues[0].message }
  const { error } = await createServiceClient()
    .from('noticias')
    .insert({
      titulo: v.data.titulo,
      corpo: v.data.corpo,
      slug: slugNoticia(v.data.titulo, randomUUID().slice(0, 6)),
      status: 'sugerida',
      sugerida_por: user.id,
      contato_sugestao: v.data.contato ?? null,
    })
  if (error) return { erro: 'Não foi possível enviar agora. Tente de novo.' }
  enviarNotificacaoParaAdmins({ title: 'Sugestão de notícia', body: v.data.titulo, url: '/painel/admin/conteudo', tag: 'sugestao-noticia' }).catch(() => undefined)
  return { erro: null }
}

const schemaSugestaoEvento = z.object({
  titulo: z.string().trim().min(5, 'Dê um nome ao evento.').max(140),
  descricao: z.string().trim().min(10, 'Conte um pouco sobre o evento.').max(2000),
  local_evento: z.string().trim().min(3, 'Onde vai ser?').max(160),
  data_evento: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Informe data e hora.'),
  contato: z.string().trim().max(120).optional(),
})

export async function sugerirEvento(formData: FormData) {
  const user = await usuarioLogado()
  if (!user) return { erro: 'Entre na sua conta para sugerir um evento.' }
  if (!(await dentroDoLimite(`sugerir-evento:${user.id}`, 5, 86400))) return { erro: 'Você já mandou várias sugestões hoje. Obrigado!' }
  const v = schemaSugestaoEvento.safeParse({
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao'),
    local_evento: formData.get('local_evento'),
    data_evento: formData.get('data_evento'),
    contato: formData.get('contato') || undefined,
  })
  if (!v.success) return { erro: v.error.issues[0].message }
  const data = new Date(`${v.data.data_evento}:00-03:00`)
  if (data.getTime() < Date.now()) return { erro: 'A data do evento já passou.' }
  const { error } = await createServiceClient()
    .from('sugestoes_evento')
    .insert({ ...v.data, data_evento: data.toISOString(), perfil_id: user.id, contato: v.data.contato ?? null })
  if (error) return { erro: 'Não foi possível enviar agora. Tente de novo.' }
  enviarNotificacaoParaAdmins({ title: 'Evento sugerido', body: v.data.titulo, url: '/painel/admin/conteudo', tag: 'sugestao-evento' }).catch(() => undefined)
  return { erro: null }
}

// ---------------------------------------------------------------------
// Admin: notícias
// ---------------------------------------------------------------------
export async function salvarNoticia(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const titulo = String(formData.get('titulo') ?? '').trim()
  const corpo = String(formData.get('corpo') ?? '').trim()
  const resumo = String(formData.get('resumo') ?? '').trim().slice(0, 300)
  const fonteNome = String(formData.get('fonte_nome') ?? '').trim().slice(0, 120)
  const fonteUrl = String(formData.get('fonte_url') ?? '').trim()
  const status = String(formData.get('status') ?? 'rascunho')
  if (titulo.length < 5 || titulo.length > 160) return { erro: 'Título entre 5 e 160 letras.' }
  if (!['rascunho', 'publicada', 'arquivada'].includes(status)) return { erro: 'Situação inválida.' }
  if (fonteUrl && !urlSegura(fonteUrl)) return { erro: 'Link da fonte inválido.' }
  if (status === 'publicada' && corpo.length < 20 && !fonteUrl) return { erro: 'Escreva o texto ou informe o link da fonte antes de publicar.' }

  const db = createServiceClient()
  const dados: Record<string, unknown> = {
    titulo,
    corpo,
    resumo: resumo || null,
    fonte_nome: fonteNome || null,
    fonte_url: fonteUrl || null,
    status,
    patrocinada: formData.get('patrocinada') === 'on',
    destaque: formData.get('destaque') === 'on',
    atualizado_em: new Date().toISOString(),
  }
  const imagem = formData.get('imagem') as File | null
  if (imagem && imagem.size > 0) {
    const r = await enviarImagem(db as unknown as ReturnType<typeof createClient>, imagem, `noticias/${id || 'nova'}`)
    if (r.erro) return { erro: r.erro }
    dados.imagem_url = r.url
  }

  if (id) {
    const { data: atual } = await db.from('noticias').select('status, publicada_em').eq('id', id).maybeSingle()
    if (!atual) return { erro: 'Notícia não encontrada.' }
    if (status === 'publicada' && !atual.publicada_em) dados.publicada_em = new Date().toISOString()
    const { error } = await db.from('noticias').update(dados).eq('id', id)
    if (error) return { erro: 'Não foi possível salvar.' }
  } else {
    dados.slug = slugNoticia(titulo, randomUUID().slice(0, 6))
    if (status === 'publicada') dados.publicada_em = new Date().toISOString()
    const { error } = await db.from('noticias').insert(dados)
    if (error) return { erro: 'Não foi possível salvar.' }
  }
  await db.from('registros_auditoria').insert({ ator_id: auth.user.id, acao: 'noticia.salvar', entidade: 'noticia', entidade_id: id || null, dados: { titulo, status } })
  revalidatePath('/noticias')
  revalidatePath('/painel/admin/conteudo')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Admin: sugestões de evento
// ---------------------------------------------------------------------
export async function decidirSugestaoEvento(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const decisao = String(formData.get('decisao') ?? '')
  const db = createServiceClient()
  const { data: s } = await db.from('sugestoes_evento').select('*').eq('id', id).eq('status', 'aberta').maybeSingle()
  if (!s) return { erro: 'Sugestão não encontrada ou já decidida.' }
  if (decisao === 'recusar') {
    await db.from('sugestoes_evento').update({ status: 'recusada' }).eq('id', id)
  } else {
    const { data: aviso, error } = await db
      .from('avisos_cidade')
      .insert({
        tipo: 'evento',
        titulo: s.titulo,
        conteudo: s.contato ? `${s.descricao}\n\nContato: ${s.contato}` : s.descricao,
        local_evento: s.local_evento,
        data_evento: s.data_evento,
        publicado_por: auth.user.id,
      })
      .select('id')
      .single()
    if (error || !aviso) return { erro: 'Não foi possível publicar o evento.' }
    await db.from('sugestoes_evento').update({ status: 'aprovada', aviso_id: aviso.id }).eq('id', id)
    if (s.perfil_id) {
      const { notificar } = await import('@/lib/notificacoes/notificar')
      await notificar([s.perfil_id], { tipo: 'evento', titulo: 'Seu evento foi publicado 🎉', corpo: s.titulo, url: `/agenda#evento-${aviso.id}` })
    }
  }
  revalidatePath('/agenda')
  revalidatePath('/painel/admin/conteudo')
  return { erro: null }
}

// ---------------------------------------------------------------------
// Admin: serviços úteis
// ---------------------------------------------------------------------
const CATEGORIAS_SERVICO = ['emergencia', 'saude', 'farmacia_plantao', 'prefeitura', 'transporte', 'coleta', 'outros'] as const

export async function salvarServicoUtil(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const texto = (c: string, max: number) => String(formData.get(c) ?? '').trim().slice(0, max) || null
  const categoria = String(formData.get('categoria') ?? '')
  if (!(CATEGORIAS_SERVICO as readonly string[]).includes(categoria)) return { erro: 'Escolha a categoria.' }
  const nome = texto('nome', 120)
  if (!nome || nome.length < 2) return { erro: 'Informe o nome.' }
  const dataOk = (v: string | null) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v)
  const plantaoInicio = texto('plantao_inicio', 10)
  const plantaoFim = texto('plantao_fim', 10)
  if (!dataOk(plantaoInicio) || !dataOk(plantaoFim)) return { erro: 'Datas de plantão inválidas.' }
  const dados = {
    categoria,
    nome,
    telefone: texto('telefone', 40),
    whatsapp: texto('whatsapp', 20)?.replace(/\D/g, '') || null,
    endereco: texto('endereco', 200),
    horario: texto('horario', 120),
    observacao: texto('observacao', 300),
    plantao_inicio: plantaoInicio,
    plantao_fim: plantaoFim,
    ordem: Number(formData.get('ordem') ?? 0) || 0,
    ativo: formData.get('ativo') !== 'off',
    atualizado_em: new Date().toISOString(),
  }
  const db = createServiceClient()
  const { error } = id ? await db.from('servicos_uteis').update(dados).eq('id', id) : await db.from('servicos_uteis').insert(dados)
  if (error) return { erro: 'Não foi possível salvar.' }
  revalidatePath('/servicos-uteis')
  revalidatePath('/painel/admin/conteudo')
  return { erro: null }
}

export async function removerServicoUtil(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  await createServiceClient().from('servicos_uteis').update({ ativo: false }).eq('id', String(formData.get('id') ?? ''))
  revalidatePath('/servicos-uteis')
  revalidatePath('/painel/admin/conteudo')
  return { erro: null }
}
