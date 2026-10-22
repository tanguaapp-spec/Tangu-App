'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { clienteMercadoPago, ErroMercadoPago, mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { sincronizarPreapproval } from '@/lib/pagamentos/processar-evento'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'
import { urlDoSite } from '@/lib/site'

/**
 * Contratação, troca e cancelamento SEM intervenção do dono da plataforma.
 * Nada aqui concede plano: só cria/atualiza a cobrança no Mercado Pago. O
 * plano passa a valer quando o webhook/reconciliação confirma cobrança
 * aprovada (lib/pagamentos/estado-assinatura.ts).
 */

const MSG_INDISPONIVEL =
  'Os planos pagos ainda não estão disponíveis pra contratação. Você pode continuar usando o plano Gratuito normalmente.'

async function contexto() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta pra continuar.' as const }

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nome, status_cadastro')
    .eq('reivindicado_por', user.id)
    .maybeSingle()
  if (!negocio) return { erro: 'Cadastre seu negócio antes de escolher um plano.' as const }
  if (negocio.status_cadastro !== 'aprovado') {
    return { erro: 'Seu cadastro ainda está em análise. Assim que for liberado, você pode contratar um plano.' as const }
  }

  return { user, negocio, admin: createServiceClient() } as const
}

async function auditar(atorId: string, acao: string, entidadeId: string, dados: Record<string, unknown>) {
  await createServiceClient().from('registros_auditoria').insert({ ator_id: atorId, acao, entidade: 'assinatura', entidade_id: entidadeId, dados })
}

export async function iniciarAssinatura(planoId: string) {
  if (!mercadoPagoConfigurado()) return { erro: MSG_INDISPONIVEL }
  const ctx = await contexto()
  if ('erro' in ctx) return { erro: ctx.erro }
  const { user, negocio, admin } = ctx

  if (!(await dentroDoLimite(`assinar:${user.id}`, 5, 60 * 60))) {
    return { erro: 'Muitas tentativas seguidas. Aguarde alguns minutos.' }
  }

  const { data: plano } = await admin
    .from('planos')
    .select('id, nome, preco_centavos, ativo')
    .eq('id', String(planoId))
    .maybeSingle()
  if (!plano || !plano.ativo) return { erro: 'Esse plano não está disponível.' }
  if (plano.preco_centavos <= 0) return { erro: 'O plano Gratuito não precisa de contratação.' }

  const { data: aberta } = await admin
    .from('assinaturas')
    .select('id, status, plano_id, provedor_assinatura_id')
    .eq('negocio_id', negocio.id)
    .in('status', ['pendente', 'ativa', 'em_atraso'])
    .maybeSingle()

  if (aberta && aberta.status !== 'pendente') {
    if (aberta.plano_id === plano.id) return { erro: 'Você já está nesse plano.' }
    return trocarPlano(plano.id)
  }

  // checkout anterior não concluído: encerra antes de abrir outro
  if (aberta?.status === 'pendente') {
    if (aberta.provedor_assinatura_id) {
      await clienteMercadoPago.cancelarAssinatura(aberta.provedor_assinatura_id).catch(() => undefined)
    }
    await admin.from('assinaturas').update({ status: 'expirada', cancelada_em: new Date().toISOString() }).eq('id', aberta.id)
  }

  const { data: nova, error } = await admin
    .from('assinaturas')
    .insert({
      negocio_id: negocio.id,
      plano_id: plano.id,
      status: 'pendente',
      valor_centavos: plano.preco_centavos,
      criado_por: user.id,
    })
    .select('id')
    .single()
  if (error || !nova) {
    await registrarErro({ mensagem: `Falha ao criar assinatura local: ${error?.message}`, contexto: 'iniciarAssinatura', usuarioId: user.id })
    return { erro: 'Não foi possível iniciar a contratação agora. Tente de novo em instantes.' }
  }

  try {
    const preapproval = await clienteMercadoPago.criarAssinatura({
      motivo: `Tanguá App — plano ${plano.nome} (${negocio.nome})`.slice(0, 120),
      referenciaExterna: nova.id,
      emailPagador: user.email ?? '',
      valor: plano.preco_centavos / 100,
      urlRetorno: `${urlDoSite()}/painel/negocio/assinatura?retorno=1`,
    })
    await admin.from('assinaturas').update({ provedor_assinatura_id: preapproval.id }).eq('id', nova.id)
    await auditar(user.id, 'assinatura.iniciar', nova.id, { plano: plano.id, valor_centavos: plano.preco_centavos })
    if (!preapproval.init_point) throw new Error('Mercado Pago não devolveu init_point')
    return { erro: null, urlPagamento: preapproval.init_point }
  } catch (err) {
    await admin.from('assinaturas').update({ status: 'expirada' }).eq('id', nova.id)
    await registrarErro({
      mensagem: `Mercado Pago recusou criação de assinatura: ${(err as Error).message}`,
      contexto: 'iniciarAssinatura',
      usuarioId: user.id,
    })
    return {
      erro:
        err instanceof ErroMercadoPago && err.status >= 400 && err.status < 500
          ? 'O Mercado Pago não aceitou os dados da contratação. Confira se o e-mail da sua conta é válido e tente de novo.'
          : 'O serviço de pagamento não respondeu. Nenhuma cobrança foi feita — tente de novo em instantes.',
    }
  }
}

/**
 * Upgrade/downgrade de quem já paga: ajusta o valor no Mercado Pago (vale a
 * partir da próxima cobrança) e troca o plano na hora. Sem cobrança
 * proporcional — regra comercial a revisar (docs/PAGAMENTOS.md).
 */
export async function trocarPlano(planoId: string) {
  if (!mercadoPagoConfigurado()) return { erro: MSG_INDISPONIVEL }
  const ctx = await contexto()
  if ('erro' in ctx) return { erro: ctx.erro }
  const { user, negocio, admin } = ctx

  const [{ data: plano }, { data: atual }] = await Promise.all([
    admin.from('planos').select('id, nome, preco_centavos, ativo, recursos').eq('id', String(planoId)).maybeSingle(),
    admin
      .from('assinaturas')
      .select('id, status, plano_id, provedor_assinatura_id')
      .eq('negocio_id', negocio.id)
      .in('status', ['ativa', 'em_atraso'])
      .maybeSingle(),
  ])
  if (!plano || !plano.ativo) return { erro: 'Esse plano não está disponível.' }
  if (!atual?.provedor_assinatura_id) return { erro: 'Você não tem assinatura ativa pra trocar.' }
  if (atual.status === 'em_atraso') return { erro: 'Regularize o pagamento pendente antes de trocar de plano.' }
  if (plano.preco_centavos <= 0) return cancelarAssinatura()

  try {
    await clienteMercadoPago.atualizarValorAssinatura(
      atual.provedor_assinatura_id,
      plano.preco_centavos / 100,
      `Tanguá App — plano ${plano.nome} (${negocio.nome})`.slice(0, 120)
    )
  } catch (err) {
    await registrarErro({ mensagem: `Falha ao trocar plano no MP: ${(err as Error).message}`, contexto: 'trocarPlano', usuarioId: user.id })
    return { erro: 'Não foi possível trocar de plano agora. Nada foi alterado — tente de novo em instantes.' }
  }

  await admin.from('assinaturas').update({ plano_id: plano.id, valor_centavos: plano.preco_centavos, atualizado_em: new Date().toISOString() }).eq('id', atual.id)
  if (!plano.recursos?.destaque_busca) {
    await admin.from('negocios').update({ destaque_ativo: false, destaque_expira_em: new Date().toISOString() }).eq('id', negocio.id)
  }
  await auditar(user.id, 'assinatura.trocar_plano', atual.id, { de: atual.plano_id, para: plano.id })
  await sincronizarPreapproval(atual.provedor_assinatura_id).catch(() => undefined)

  revalidatePath('/painel/negocio/assinatura')
  revalidatePath('/painel/negocio')
  return { erro: null, trocado: true }
}

export async function cancelarAssinatura() {
  const ctx = await contexto()
  if ('erro' in ctx) return { erro: ctx.erro }
  const { user, negocio, admin } = ctx

  const { data: atual } = await admin
    .from('assinaturas')
    .select('id, status, provedor_assinatura_id')
    .eq('negocio_id', negocio.id)
    .in('status', ['pendente', 'ativa', 'em_atraso'])
    .maybeSingle()
  if (!atual) return { erro: 'Você não tem assinatura ativa.' }

  if (atual.provedor_assinatura_id) {
    try {
      await clienteMercadoPago.cancelarAssinatura(atual.provedor_assinatura_id)
    } catch (err) {
      await registrarErro({ mensagem: `Falha ao cancelar no MP: ${(err as Error).message}`, contexto: 'cancelarAssinatura', usuarioId: user.id })
      return { erro: 'Não conseguimos falar com o serviço de pagamento agora. Tente de novo em instantes — nada foi cobrado a mais.' }
    }
    await sincronizarPreapproval(atual.provedor_assinatura_id).catch(() => undefined)
  } else {
    await admin.from('assinaturas').update({ status: 'expirada', cancelada_em: new Date().toISOString() }).eq('id', atual.id)
  }

  await auditar(user.id, 'assinatura.cancelar', atual.id, { status_anterior: atual.status })
  revalidatePath('/painel/negocio/assinatura')
  revalidatePath('/painel/negocio')
  return { erro: null, cancelado: true }
}

/** Botão "atualizar status" na tela de retorno: re-consulta o MP (não concede nada por si). */
export async function atualizarStatusAssinatura() {
  const ctx = await contexto()
  if ('erro' in ctx) return { erro: ctx.erro }
  if (!mercadoPagoConfigurado()) return { erro: null }
  if (!(await dentroDoLimite(`sync-assinatura:${ctx.user.id}`, 10, 10 * 60))) return { erro: null }

  const { data: atual } = await ctx.admin
    .from('assinaturas')
    .select('provedor_assinatura_id')
    .eq('negocio_id', ctx.negocio.id)
    .in('status', ['pendente', 'ativa', 'em_atraso'])
    .maybeSingle()
  if (atual?.provedor_assinatura_id) {
    await sincronizarPreapproval(atual.provedor_assinatura_id).catch(() => undefined)
  }
  revalidatePath('/painel/negocio/assinatura')
  return { erro: null }
}
