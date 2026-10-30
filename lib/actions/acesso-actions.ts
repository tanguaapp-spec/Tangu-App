'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { linkWhatsapp } from '@/lib/leads/segmentos'
import { telefoneDaConta } from '@/lib/auth/acesso'
import { urlDoSite } from '@/lib/site'

const schemaEmail = z.string().trim().toLowerCase().email('Confira o e-mail digitado.').max(200)

/**
 * Morador ou lojista que não recebe o e-mail pede o link pelo WhatsApp.
 * Sempre responde igual, exista ou não a conta (não dá pra descobrir quem
 * está cadastrado). O pedido só entra na fila se a conta tem um número.
 */
export async function pedirAcessoPeloWhatsapp(formData: FormData) {
  const validado = schemaEmail.safeParse(formData.get('email'))
  if (!validado.success) return { erro: validado.error.issues[0].message, enviado: false }

  const porIp = await dentroDoLimite(`acesso-whats-ip:${ipDoRequest()}`, 5, 60 * 60)
  const porEmail = await dentroDoLimite(`acesso-whats-email:${validado.data}`, 2, 24 * 60 * 60)
  if (!porIp || !porEmail) return { erro: 'Você já pediu há pouco. Aguarde a nossa mensagem no WhatsApp.', enviado: false }

  const db = createServiceClient()
  const { data: perfilId, error } = await db.rpc('perfil_id_por_email', { p_email: validado.data })
  if (error) {
    // antes da migration 0028
    console.error('Pedido de acesso pelo WhatsApp indisponível:', error.message)
    return { erro: 'Esta opção ainda não está disponível. Use o e-mail ou fale com a gente em Ajuda.', enviado: false }
  }
  if (!perfilId || !(await telefoneDaConta(db, perfilId as string))) return { erro: null, enviado: true }

  const { error: erroPedido } = await db.from('pedidos_acesso').insert({ perfil_id: perfilId })
  // 23505 = já tem pedido aberto: segue igual, sem avisar o time de novo
  if (!erroPedido) {
    enviarNotificacaoParaAdmins({
      title: 'Pedido de acesso pelo WhatsApp',
      body: 'Alguém não consegue entrar na conta: mande o link de nova senha (1 toque).',
      url: '/painel/admin/suporte#acesso',
      tag: 'acesso-whatsapp',
    }).catch(() => undefined)
  }
  return { erro: null, enviado: true }
}

/**
 * Admin gera o link de nova senha e recebe o link do WhatsApp com a
 * mensagem pronta, sempre para o número que já está na conta. Aceita um
 * pedido da fila (pedido_id) ou uma conta direto (perfil_id, pela tela de
 * Usuários). O link de senha não é guardado em lugar nenhum.
 */
export async function enviarLinkAcesso(formData: FormData): Promise<{ erro: string | null; whatsapp?: string }> {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const db = createServiceClient()

  const pedidoId = String(formData.get('pedido_id') ?? '')
  let perfilId = String(formData.get('perfil_id') ?? '')
  if (pedidoId) {
    const { data: pedido } = await db.from('pedidos_acesso').select('perfil_id, status').eq('id', pedidoId).maybeSingle()
    if (!pedido || pedido.status === 'cancelado') return { erro: 'Pedido não encontrado.' }
    perfilId = pedido.perfil_id as string
  }
  if (!z.string().uuid().safeParse(perfilId).success) return { erro: 'Conta inválida.' }

  const [{ data: conta }, { data: perfil }, telefone] = await Promise.all([
    db.auth.admin.getUserById(perfilId),
    db.from('perfis').select('nome_completo, suspenso_em').eq('id', perfilId).maybeSingle(),
    telefoneDaConta(db, perfilId),
  ])
  const email = conta?.user?.email
  if (!email || !perfil) return { erro: 'Conta não encontrada.' }
  if (perfil.suspenso_em) return { erro: 'Esta conta está suspensa. Reative em Usuários antes de enviar acesso.' }
  if (!telefone) return { erro: 'A conta não tem WhatsApp cadastrado (nem no perfil, nem no negócio). Peça para a pessoa falar com a gente por outro canal.' }

  const { data: gerado, error } = await db.auth.admin.generateLink({ type: 'recovery', email })
  const token = gerado?.properties?.hashed_token
  if (error || !token) return { erro: 'Não foi possível gerar o link agora. Tente de novo em instantes.' }

  // abre uma página com botão (e não o link direto): a prévia do WhatsApp não gasta o link
  const link = `${urlDoSite()}/acesso?token=${encodeURIComponent(token)}`
  const nome = String(perfil.nome_completo ?? '').trim().split(/\s+/)[0]
  const mensagem = `Olá${nome ? `, ${nome}` : ''}! Aqui é do Tanguá App. Você pediu ajuda para entrar na sua conta. Toque no link e crie uma senha nova (vale por 1 hora e só funciona uma vez): ${link}\n\nSe não foi você, ignore esta mensagem.`
  const whatsapp = linkWhatsapp(telefone.numero, mensagem)
  if (!whatsapp) return { erro: `O número cadastrado (${telefone.numero}) não parece um celular válido.` }

  const agora = new Date().toISOString()
  if (pedidoId) await db.from('pedidos_acesso').update({ status: 'enviado', enviado_por: auth.user.id, enviado_em: agora }).eq('id', pedidoId)
  else await db.from('pedidos_acesso').update({ status: 'enviado', enviado_por: auth.user.id, enviado_em: agora }).eq('perfil_id', perfilId).eq('status', 'pendente')
  await db.from('registros_auditoria').insert({
    ator_id: auth.user.id,
    acao: 'acesso.link_whatsapp',
    entidade: 'perfil',
    entidade_id: perfilId,
    dados: { origem_numero: telefone.origem, pedido: pedidoId || null },
  })
  revalidatePath('/painel/admin/suporte')
  return { erro: null, whatsapp }
}

export async function cancelarPedidoAcesso(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const id = String(formData.get('pedido_id') ?? '')
  await createServiceClient().from('pedidos_acesso').update({ status: 'cancelado' }).eq('id', id).eq('status', 'pendente')
  revalidatePath('/painel/admin/suporte')
  return { erro: null }
}

/** Botão "Criar nova senha" da página /acesso: troca o token por sessão e segue pra nova senha. */
export async function confirmarLinkAcesso(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) redirect('/esqueci-senha?link=invalido')
  const { error } = await createClient().auth.verifyOtp({ type: 'recovery', token_hash: token })
  if (error) redirect('/esqueci-senha?link=invalido')
  redirect('/redefinir-senha')
}
