'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { notificar } from '@/lib/notificacoes/notificar'
import { lerPrecoCentavos } from '@/lib/admin/configuracoes'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { enviarEmailParaPerfis } from '@/lib/email/enviar'
import { urlDoSite } from '@/lib/site'

/**
 * Pedido de orçamento. Privacidade: o negócio vê só título, descrição,
 * bairro e o primeiro nome do morador — nunca telefone/e-mail. A conversa
 * acontece pelo app; o morador decide se chama o negócio no WhatsApp.
 */

const MAX_ESCOLHIDOS = 5
const MAX_POR_CATEGORIA = 8

const schemaPedido = z.object({
  titulo: z.string().trim().min(5, 'Resuma o pedido em pelo menos 5 letras.').max(120, 'Título muito longo.'),
  descricao: z.string().trim().min(10, 'Descreva um pouco mais (pelo menos 10 letras).').max(2000, 'Descrição muito longa.'),
  bairro: z.string().trim().max(100).optional(),
  categoriaId: z.string().uuid().optional(),
})

const uuid = (v: unknown) => z.string().uuid().safeParse(v).success

export async function criarPedidoOrcamento(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta pra pedir orçamento.' }

  const validado = schemaPedido.safeParse({
    titulo: formData.get('titulo'),
    descricao: formData.get('descricao'),
    bairro: String(formData.get('bairro') ?? '').trim() || undefined,
    categoriaId: String(formData.get('categoria_id') ?? '') || undefined,
  })
  if (!validado.success) return { erro: validado.error.issues[0].message }
  const dados = validado.data

  const escolhidos = Array.from(new Set(formData.getAll('negocios').map(String).filter(uuid))).slice(0, MAX_ESCOLHIDOS)
  const enviarCategoria = formData.get('enviar_categoria') === 'on'
  if (escolhidos.length === 0 && !(enviarCategoria && dados.categoriaId)) {
    return { erro: 'Escolha pelo menos um negócio, ou escolha a categoria e autorize o envio pros profissionais dela.' }
  }

  if (!(await dentroDoLimite(`orcamento:${user.id}`, 5, 24 * 60 * 60))) {
    return { erro: 'Você já fez vários pedidos hoje. Acompanhe as respostas em "Meus orçamentos".' }
  }

  // destinatários: só negócios aprovados e no ar, nunca o próprio
  let destinatarios: { id: string; reivindicado_por: string | null }[] = []
  if (escolhidos.length) {
    const { data } = await supabase
      .from('negocios')
      .select('id, reivindicado_por')
      .in('id', escolhidos)
      .eq('ativo', true)
      .eq('status_cadastro', 'aprovado')
    destinatarios = data ?? []
  } else if (dados.categoriaId) {
    const { data } = await supabase
      .from('negocios')
      .select('id, reivindicado_por')
      .eq('categoria_id', dados.categoriaId)
      .eq('ativo', true)
      .eq('status_cadastro', 'aprovado')
      .not('reivindicado_por', 'is', null)
      .order('destaque_ativo', { ascending: false })
      .order('atualizado_em', { ascending: false })
      .limit(MAX_POR_CATEGORIA)
    destinatarios = data ?? []
  }
  destinatarios = destinatarios.filter((d) => d.reivindicado_por && d.reivindicado_por !== user.id)
  if (destinatarios.length === 0) {
    return { erro: 'Ainda não há negócios que possam receber esse pedido. Tente outra categoria ou escolha negócios na busca.' }
  }

  const { data: pedido, error } = await supabase
    .from('pedidos_orcamento')
    .insert({
      solicitante_id: user.id,
      categoria_id: dados.categoriaId ?? null,
      titulo: dados.titulo,
      descricao: dados.descricao,
      bairro: dados.bairro ?? null,
    })
    .select('id')
    .single()
  if (error || !pedido) {
    console.error('Falha ao criar pedido de orçamento:', error?.message)
    return { erro: 'Não foi possível enviar o pedido agora. Tente de novo.' }
  }

  const { error: erroDest } = await createServiceClient()
    .from('pedido_destinatarios')
    .insert(destinatarios.map((d) => ({ pedido_id: pedido.id, negocio_id: d.id })))
  if (erroDest) console.error('Falha ao gravar destinatários:', erroDest.message)

  // donos e equipe de cada negócio
  const { data: equipe } = await createServiceClient()
    .from('membros_negocio')
    .select('perfil_id')
    .in('negocio_id', destinatarios.map((d) => d.id))
  await notificar(
    [...destinatarios.map((d) => d.reivindicado_por!), ...(equipe ?? []).map((m) => m.perfil_id as string)],
    { tipo: 'orcamento', titulo: 'Novo pedido de orçamento', corpo: dados.titulo, url: `/painel/negocio/orcamentos/${pedido.id}` }
  )
  // pedido de cliente é dinheiro na mesa: avisa também por e-mail (se configurado)
  await enviarEmailParaPerfis(
    destinatarios.map((d) => d.reivindicado_por!),
    {
      assunto: `Novo pedido de orçamento: ${dados.titulo}`,
      titulo: 'Alguém de Tanguá pediu orçamento pra você',
      texto: `${dados.titulo}${dados.bairro ? ` (${dados.bairro})` : ''}\n\nResponda pelo app: quem responde primeiro costuma fechar.`,
      botao: 'Ver e responder',
      url: `${urlDoSite()}/painel/negocio/orcamentos/${pedido.id}`,
    }
  )

  revalidatePath('/orcamentos')
  return { erro: null, pedidoId: pedido.id, enviadoPara: destinatarios.length }
}

export async function responderPedidoOrcamento(pedidoId: string, formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { negocio } = await negocioDoPainel()
  if (!negocio) return { erro: 'Negócio não encontrado.' }

  const mensagem = String(formData.get('mensagem') ?? '').trim()
  if (mensagem.length < 2 || mensagem.length > 2000) return { erro: 'Escreva uma resposta (até 2000 caracteres).' }
  const valorTexto = String(formData.get('valor') ?? '').trim()
  const valor = valorTexto ? lerPrecoCentavos(valorTexto) : null
  if (valor !== null && (!Number.isFinite(valor) || valor < 0)) return { erro: 'Valor inválido. Use o formato 150,00.' }
  const prazo = String(formData.get('prazo') ?? '').trim().slice(0, 100) || null

  if (!(await dentroDoLimite(`responder-orc:${user.id}`, 60, 60 * 60))) return { erro: 'Muitas respostas seguidas. Aguarde um pouco.' }

  // RLS confere: negócio é destinatário e o pedido está aberto
  const { error } = await supabase
    .from('respostas_orcamento')
    .insert({ pedido_id: pedidoId, negocio_id: negocio.id, mensagem, valor_centavos: valor, prazo })
  if (error) return { erro: 'Esse pedido não aceita mais respostas (encerrado ou expirado).' }

  const { data: pedido } = await createServiceClient().from('pedidos_orcamento').select('solicitante_id, titulo').eq('id', pedidoId).maybeSingle()
  if (pedido?.solicitante_id) {
    await notificar([pedido.solicitante_id], {
      tipo: 'orcamento',
      titulo: `${negocio.nome} respondeu seu pedido`,
      corpo: pedido.titulo,
      url: `/orcamentos/${pedidoId}`,
    })
    await enviarEmailParaPerfis([pedido.solicitante_id], {
      assunto: `${negocio.nome} respondeu seu pedido de orçamento`,
      titulo: `${negocio.nome} respondeu`,
      texto: `Seu pedido "${pedido.titulo}" recebeu uma resposta${valor !== null ? ' com valor' : ''}. Veja no app e, se gostar, chame no WhatsApp.`,
      botao: 'Ver resposta',
      url: `${urlDoSite()}/orcamentos/${pedidoId}`,
    })
  }

  revalidatePath(`/painel/negocio/orcamentos/${pedidoId}`)
  return { erro: null }
}

export async function marcarPedidoVisto(pedidoId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !uuid(pedidoId)) return
  const { negocio } = await negocioDoPainel()
  if (!negocio) return
  await createServiceClient()
    .from('pedido_destinatarios')
    .update({ visto_em: new Date().toISOString() })
    .eq('pedido_id', pedidoId)
    .eq('negocio_id', negocio.id)
    .is('visto_em', null)
}

export async function encerrarPedidoOrcamento(pedidoId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const { error } = await createServiceClient()
    .from('pedidos_orcamento')
    .update({ status: 'encerrado', encerrado_em: new Date().toISOString() })
    .eq('id', pedidoId)
    .eq('solicitante_id', user.id)
  if (error) return { erro: 'Não foi possível encerrar.' }

  revalidatePath(`/orcamentos/${pedidoId}`)
  revalidatePath('/orcamentos')
  return { erro: null }
}

/** Respostas prontas do negócio (botões de um toque na hora de responder). Só a dona edita. */
export async function salvarRespostasProntas(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }
  const lista = formData
    .getAll('resposta')
    .map((r) => String(r).trim().slice(0, 500))
    .filter(Boolean)
    .slice(0, 6)
  const { error } = await supabase.from('negocios').update({ respostas_prontas: lista }).eq('reivindicado_por', user.id)
  if (error) return { erro: 'Não foi possível salvar agora.' }
  revalidatePath('/painel/negocio/orcamentos')
  return { erro: null }
}

/** Morador escolhe a resposta que fechou (o negócio é avisado). */
export async function escolherRespostaOrcamento(pedidoId: string, respostaId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }
  if (!uuid(pedidoId) || !uuid(respostaId)) return { erro: 'Pedido inválido.' }
  const db = createServiceClient()
  const { data: resposta } = await db
    .from('respostas_orcamento')
    .select('id, negocio_id, pedido:pedidos_orcamento!inner(solicitante_id, titulo)')
    .eq('id', respostaId)
    .eq('pedido_id', pedidoId)
    .maybeSingle()
  const pedido = resposta?.pedido as { solicitante_id?: string; titulo?: string } | undefined
  if (!resposta || pedido?.solicitante_id !== user.id) return { erro: 'Resposta não encontrada.' }

  const { error } = await db
    .from('pedidos_orcamento')
    .update({ resposta_escolhida_id: respostaId, status: 'encerrado', encerrado_em: new Date().toISOString() })
    .eq('id', pedidoId)
    .eq('solicitante_id', user.id)
  if (error) return { erro: 'Não foi possível salvar agora.' }

  const { data: negocio } = await db.from('negocios').select('reivindicado_por').eq('id', resposta.negocio_id).maybeSingle()
  if (negocio?.reivindicado_por) {
    await notificar([negocio.reivindicado_por], {
      tipo: 'orcamento_escolhido',
      titulo: 'Seu orçamento foi o escolhido!',
      corpo: `${pedido?.titulo ?? 'Pedido'}: o morador vai te chamar no WhatsApp.`,
      url: `/painel/negocio/orcamentos/${pedidoId}`,
    })
  }
  revalidatePath(`/orcamentos/${pedidoId}`)
  return { erro: null }
}
