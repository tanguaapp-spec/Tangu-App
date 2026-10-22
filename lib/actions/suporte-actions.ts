'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { notificar } from '@/lib/notificacoes/notificar'
import { caminhoInternoSeguro } from '@/lib/site'
import { CATEGORIAS_CHAMADO } from '@/lib/ajuda/chamados'


const schemaChamado = z.object({
  categoria: z.enum(Object.keys(CATEGORIAS_CHAMADO) as [keyof typeof CATEGORIAS_CHAMADO, ...(keyof typeof CATEGORIAS_CHAMADO)[]]),
  assunto: z.string().trim().min(5, 'Escreva um assunto com pelo menos 5 letras.').max(140, 'Assunto muito longo.'),
  mensagem: z.string().trim().min(10, 'Conte um pouco mais (pelo menos 10 letras).').max(4000, 'Mensagem muito longa.'),
})

const schemaMensagem = z.string().trim().min(1, 'Escreva uma mensagem.').max(4000, 'Mensagem muito longa.')

export async function abrirChamado(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta pra abrir um chamado.' }

  const validado = schemaChamado.safeParse({
    categoria: formData.get('categoria'),
    assunto: formData.get('assunto'),
    mensagem: formData.get('mensagem'),
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }

  if (!(await dentroDoLimite(`chamado:${user.id}`, 5, 24 * 60 * 60))) {
    return { erro: 'Você já abriu vários chamados hoje. Acompanhe as respostas em "Meus chamados".' }
  }

  const { data: negocio } = await supabase.from('negocios').select('id').eq('reivindicado_por', user.id).maybeSingle()

  // contexto técnico mínimo — nada de cookies/tokens
  const contexto = {
    pagina: caminhoInternoSeguro(String(formData.get('pagina') ?? ''), ''),
    navegador: (headers().get('user-agent') ?? '').slice(0, 200),
  }

  const { data: chamado, error } = await supabase
    .from('chamados_suporte')
    .insert({
      perfil_id: user.id,
      negocio_id: negocio?.id ?? null,
      categoria: validado.data.categoria,
      assunto: validado.data.assunto,
      contexto,
    })
    .select('id')
    .single()
  if (error || !chamado) {
    console.error('Falha ao abrir chamado:', error?.message)
    return { erro: 'Não foi possível abrir o chamado agora. Tente de novo em instantes.' }
  }

  await supabase.from('mensagens_chamado').insert({ chamado_id: chamado.id, autor_id: user.id, corpo: validado.data.mensagem })

  await enviarNotificacaoParaAdmins({
    title: 'Novo chamado de suporte',
    body: `${CATEGORIAS_CHAMADO[validado.data.categoria]}: ${validado.data.assunto}`,
    url: `/painel/admin/suporte/${chamado.id}`,
    tag: 'suporte',
  }).catch(() => {})

  revalidatePath('/ajuda/chamados')
  return { erro: null, chamadoId: chamado.id }
}

export async function responderMeuChamado(chamadoId: string, formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }

  const corpo = schemaMensagem.safeParse(formData.get('corpo'))
  if (!corpo.success) return { erro: corpo.error.issues[0].message }
  if (!(await dentroDoLimite(`chamado-msg:${user.id}`, 30, 60 * 60))) return { erro: 'Muitas mensagens seguidas. Aguarde um pouco.' }

  // RLS garante que só o dono do chamado (e chamado não fechado) consegue inserir
  const { error } = await supabase.from('mensagens_chamado').insert({ chamado_id: chamadoId, autor_id: user.id, corpo: corpo.data })
  if (error) return { erro: 'Não foi possível enviar. Se o chamado foi fechado, abra um novo.' }

  await createServiceClient()
    .from('chamados_suporte')
    .update({ status: 'aberto', atualizado_em: new Date().toISOString() })
    .eq('id', chamadoId)
    .eq('perfil_id', user.id)
    .in('status', ['respondido', 'resolvido'])

  revalidatePath(`/ajuda/chamados/${chamadoId}`)
  return { erro: null }
}

export async function fecharMeuChamado(chamadoId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }

  const { error } = await createServiceClient()
    .from('chamados_suporte')
    .update({ status: 'fechado', atualizado_em: new Date().toISOString() })
    .eq('id', chamadoId)
    .eq('perfil_id', user.id)
  if (error) return { erro: 'Não foi possível fechar o chamado.' }

  revalidatePath(`/ajuda/chamados/${chamadoId}`)
  revalidatePath('/ajuda/chamados')
  return { erro: null }
}

const STATUS_ADMIN = ['respondido', 'escalado', 'resolvido', 'fechado'] as const

export async function responderComoSuporte(chamadoId: string, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const corpoBruto = String(formData.get('corpo') ?? '').trim()
  const status = String(formData.get('status') ?? 'respondido') as (typeof STATUS_ADMIN)[number]
  if (!STATUS_ADMIN.includes(status)) return { erro: 'Situação inválida.' }

  const db = createServiceClient()
  const { data: chamado } = await db.from('chamados_suporte').select('id, perfil_id, assunto, status').eq('id', chamadoId).maybeSingle()
  if (!chamado) return { erro: 'Chamado não encontrado.' }

  if (corpoBruto) {
    const corpo = schemaMensagem.safeParse(corpoBruto)
    if (!corpo.success) return { erro: corpo.error.issues[0].message }
    const { error } = await db.from('mensagens_chamado').insert({ chamado_id: chamadoId, autor_id: auth.user.id, do_suporte: true, corpo: corpo.data })
    if (error) return { erro: 'Não foi possível salvar a resposta.' }
  }

  await db.from('chamados_suporte').update({ status, atualizado_em: new Date().toISOString() }).eq('id', chamadoId)
  await db.from('registros_auditoria').insert({
    ator_id: auth.user.id,
    acao: 'suporte.responder',
    entidade: 'chamado',
    entidade_id: chamadoId,
    dados: { de: chamado.status, para: status, com_mensagem: !!corpoBruto },
  })

  if (corpoBruto || status === 'resolvido') {
    await notificar([chamado.perfil_id], {
      tipo: 'suporte',
      titulo: corpoBruto ? 'O suporte respondeu seu chamado' : 'Seu chamado foi marcado como resolvido',
      corpo: chamado.assunto,
      url: `/ajuda/chamados/${chamadoId}`,
    })
  }

  revalidatePath(`/painel/admin/suporte/${chamadoId}`)
  revalidatePath('/painel/admin/suporte')
  return { erro: null }
}
