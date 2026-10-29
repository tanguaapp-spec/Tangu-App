'use server'

import { createHash, randomInt } from 'node:crypto'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { enviarNotificacaoParaAdmins } from '@/lib/push/enviar-notificacao'
import { notificar } from '@/lib/notificacoes/notificar'
import { COOKIE_NEGOCIO_ATIVO } from '@/lib/painel/negocio-atual'

const TENTATIVAS = 5

function hashCodigo(negocioId: string, perfilId: string, codigo: string) {
  const sal = process.env.METRICAS_SAL ?? 'tangua'
  return createHash('sha256').update(`${sal}|reivindicacao|${negocioId}|${perfilId}|${codigo}`).digest('hex')
}

/** "(21) 99876-5432" → "(21) •••••-5432" — mostra pra quem pediu onde o código vai chegar. */
function mascarar(tel: string) {
  const d = tel.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  return d.length >= 10 ? `(${d.slice(0, 2)}) •••••-${d.slice(-4)}` : 'cadastrado no perfil'
}

/**
 * Dono pede o código. Ele vai para o WhatsApp que JÁ está no cadastro do
 * comércio (quem não tem acesso a esse número não consegue assumir).
 */
export async function pedirCodigoReivindicacao(negocioId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta para assumir o perfil.' }
  if (!/^[0-9a-f-]{36}$/i.test(negocioId)) return { erro: 'Perfil inválido.' }
  if (!(await dentroDoLimite(`codigo-reivindicacao:${user.id}`, 5, 86400))) return { erro: 'Você já pediu vários códigos hoje. Tente amanhã ou fale com o suporte.' }

  const db = createServiceClient()
  const { data: n } = await db.from('negocios').select('id, nome, whatsapp, telefone, reivindicado_por').eq('id', negocioId).maybeSingle()
  if (!n) return { erro: 'Perfil não encontrado.' }
  if (n.reivindicado_por) return { erro: 'Este perfil já tem dono.' }
  const telefone = n.whatsapp || n.telefone
  if (!telefone) return { erro: 'Este perfil não tem telefone cadastrado. Use "Pedir de outro jeito" para enviar seus dados.' }

  // pedido aberto: reaproveita (não manda código novo a cada toque)
  const { data: aberto } = await db
    .from('codigos_reivindicacao')
    .select('id, status')
    .eq('negocio_id', negocioId)
    .eq('perfil_id', user.id)
    .in('status', ['aguardando_envio', 'enviado'])
    .gt('expira_em', new Date().toISOString())
    .maybeSingle()
  if (aberto) return { erro: null, destino: mascarar(telefone), status: aberto.status as string }

  const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0')
  const mensagem = `Olá! Aqui é do Tanguá App. Pediram para assumir o perfil de ${n.nome} no app. Se foi você, o código é ${codigo}. Se não foi, é só ignorar esta mensagem.`
  const { error } = await db.from('codigos_reivindicacao').insert({
    negocio_id: negocioId,
    perfil_id: user.id,
    codigo_hash: hashCodigo(negocioId, user.id, codigo),
    mensagem,
    telefone,
  })
  if (error) return { erro: 'Não foi possível pedir o código agora (a migration 0027 já rodou?).' }
  enviarNotificacaoParaAdmins({
    title: 'Código de reivindicação para enviar',
    body: `${n.nome}: mande o código no WhatsApp do comércio (1 toque).`,
    url: '/painel/admin/reivindicacoes#codigos',
    tag: 'codigo-reivindicacao',
  }).catch(() => undefined)
  return { erro: null, destino: mascarar(telefone), status: 'aguardando_envio' }
}

/** Dono digita o código que chegou no WhatsApp do comércio e assume o perfil na hora. */
export async function confirmarCodigoReivindicacao(negocioId: string, codigoBruto: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }
  const codigo = String(codigoBruto ?? '').replace(/\D/g, '')
  if (codigo.length !== 6) return { erro: 'O código tem 6 números.' }
  if (!(await dentroDoLimite(`confirmar-codigo:${user.id}`, 15, 3600))) return { erro: 'Muitas tentativas. Aguarde um pouco.' }

  const db = createServiceClient()
  const { data: pedido } = await db
    .from('codigos_reivindicacao')
    .select('id, codigo_hash, tentativas, expira_em')
    .eq('negocio_id', negocioId)
    .eq('perfil_id', user.id)
    .in('status', ['aguardando_envio', 'enviado'])
    .maybeSingle()
  if (!pedido) return { erro: 'Nenhum código pedido para este perfil. Toque em "Receber código" primeiro.' }
  if (new Date(pedido.expira_em) < new Date()) {
    await db.from('codigos_reivindicacao').update({ status: 'vencido', mensagem: null }).eq('id', pedido.id)
    return { erro: 'O código venceu. Peça um novo.' }
  }
  if (pedido.tentativas >= TENTATIVAS) return { erro: 'Muitas tentativas erradas. Peça um novo código.' }
  if (hashCodigo(negocioId, user.id, codigo) !== pedido.codigo_hash) {
    await db.from('codigos_reivindicacao').update({ tentativas: pedido.tentativas + 1 }).eq('id', pedido.id)
    return { erro: `Código errado. Restam ${TENTATIVAS - pedido.tentativas - 1} tentativa(s).` }
  }

  // assume só se continuar sem dono (corrida com outro pedido)
  const { data: assumido, error } = await db
    .from('negocios')
    .update({ reivindicado_por: user.id, reivindicado_em: new Date().toISOString(), verificado: true })
    .eq('id', negocioId)
    .is('reivindicado_por', null)
    .select('id, nome, slug')
    .maybeSingle()
  if (error || !assumido) return { erro: 'Este perfil acabou de ser assumido por outra pessoa. Fale com o suporte.' }
  await db.from('codigos_reivindicacao').update({ status: 'usado', mensagem: null }).eq('id', pedido.id)
  await db.from('codigos_reivindicacao').update({ status: 'cancelado', mensagem: null }).eq('negocio_id', negocioId).in('status', ['aguardando_envio', 'enviado'])
  await db.from('perfis').update({ papel: 'profissional' }).eq('id', user.id).eq('papel', 'morador')
  await db.from('registros_auditoria').insert({ ator_id: user.id, acao: 'reivindicacao.codigo', entidade: 'negocio', entidade_id: negocioId })
  await notificar([user.id], { tipo: 'reivindicacao', titulo: 'O perfil agora é seu! 🎉', corpo: `Complete ${assumido.nome} com fotos, preços e ofertas.`, url: '/painel/negocio' })
  cookies().set(COOKIE_NEGOCIO_ATIVO, negocioId, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath(`/negocio/${assumido.slug ?? negocioId}`)
  return { erro: null }
}

/** Admin marca que mandou o código pelo WhatsApp (e a mensagem com o código some da tela). */
export async function marcarCodigoEnviado(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const cancelar = formData.get('acao') === 'cancelar'
  await createServiceClient()
    .from('codigos_reivindicacao')
    .update(cancelar ? { status: 'cancelado', mensagem: null } : { status: 'enviado', enviado_por: auth.user.id, enviado_em: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/painel/admin/reivindicacoes')
  return { erro: null }
}
