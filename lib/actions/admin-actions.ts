'use server'

import { verificarAdmin } from '@/lib/auth/require-admin'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { horarioSilencioso, notificar } from '@/lib/notificacoes/notificar'
import { enviarNotificacaoParaVisitantes } from '@/lib/push/enviar-notificacao'

const requireAdmin = verificarAdmin

async function auditar(atorId: string, acao: string, entidade: string, entidadeId: string, dados: Record<string, unknown> = {}) {
  await createServiceClient()
    .from('registros_auditoria')
    .insert({ ator_id: atorId, acao, entidade, entidade_id: entidadeId, dados })
    .then(() => undefined, () => undefined)
}

export async function aprovarReivindicacao(
  solicitacaoId: string,
  negocioId: string,
  solicitanteId: string
) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const { data: negocio, error: errorNegocio } = await supabase
    .from('negocios')
    .update({
      reivindicado_por: solicitanteId,
      reivindicado_em: new Date().toISOString(),
      verificado: true,
    })
    .eq('id', negocioId)
    .select('nome')
    .single()

  if (errorNegocio) return { erro: errorNegocio.message }

  const { error: errorSolic } = await supabase
    .from('solicitacoes_reivindicacao')
    .update({
      status: 'aprovado',
      revisado_por: user.id,
      revisado_em: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)
    .eq('status', 'pendente')

  if (errorSolic) return { erro: errorSolic.message }
  await auditar(user.id, 'reivindicacao.aprovar', 'negocio', negocioId, { solicitacao: solicitacaoId, novo_dono: solicitanteId })

  await notificar([solicitanteId], {
    tipo: 'reivindicacao',
    titulo: 'Reivindicação aprovada! 🎉',
    corpo: `Agora você já pode gerenciar o perfil de ${negocio?.nome} no Tanguá App.`,
    url: '/painel/negocio',
  })

  revalidatePath('/painel/admin/reivindicacoes')
  return { erro: null }
}

export async function rejeitarReivindicacao(solicitacaoId: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const { error } = await supabase
    .from('solicitacoes_reivindicacao')
    .update({
      status: 'rejeitado',
      revisado_por: user.id,
      revisado_em: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)

  if (error) return { erro: error.message }
  await auditar(user.id, 'reivindicacao.rejeitar', 'solicitacao', solicitacaoId)

  revalidatePath('/painel/admin/reivindicacoes')
  return { erro: null }
}

export async function aprovarNegocioPendente(negocioId: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  // "verificado" é selo de verificação real (documento/visita) — aprovar a
  // revisão automática não concede o selo.
  const { data: negocio, error } = await supabase
    .from('negocios')
    .update({ status_cadastro: 'aprovado', ativo: true, motivo_moderacao: null })
    .eq('id', negocioId)
    .eq('status_cadastro', 'pendente')
    .select('nome, reivindicado_por')
    .single()

  if (error) return { erro: error.message }
  await auditar(user.id, 'negocio.aprovar', 'negocio', negocioId)

  if (negocio?.reivindicado_por) {
    await notificar([negocio.reivindicado_por], {
      tipo: 'moderacao',
      titulo: 'Seu negócio foi liberado! 🎉',
      corpo: `${negocio.nome} já está visível no diretório do Tanguá App.`,
      url: '/painel/negocio',
    })
  }

  revalidatePath('/painel/admin/negocios-pendentes')
  revalidatePath('/buscar')
  return { erro: null }
}

export async function rejeitarNegocioPendente(negocioId: string, motivo: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const motivoLimpo = (motivo ?? '').trim().slice(0, 500)
  if (!motivoLimpo) return { erro: 'Informe o motivo — ele aparece pro dono do negócio corrigir.' }

  const { data: negocio, error } = await supabase
    .from('negocios')
    .update({ status_cadastro: 'rejeitado', ativo: false, motivo_rejeicao: motivoLimpo })
    .eq('id', negocioId)
    .eq('status_cadastro', 'pendente')
    .select('nome, reivindicado_por')
    .single()

  if (error) return { erro: error.message }
  await auditar(user.id, 'negocio.rejeitar', 'negocio', negocioId, { motivo: motivoLimpo })

  if (negocio?.reivindicado_por) {
    await notificar([negocio.reivindicado_por], {
      tipo: 'moderacao',
      titulo: 'Seu cadastro precisa de ajuste',
      corpo: `${negocio.nome}: ${motivoLimpo}`,
      url: '/painel/negocio',
    })
  }

  revalidatePath('/painel/admin/negocios-pendentes')
  return { erro: null }
}

/**
 * Ativa/desativa o destaque de um negócio no diretório. Pagamento é
 * combinado manualmente pelo admin fora do app (WhatsApp) — aqui só
 * registra a ativação e, se informado, a data de expiração.
 */
export async function alternarDestaque(negocioId: string, ativo: boolean, dias?: number) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const destaqueExpiraEm =
    ativo && dias ? new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString() : ativo ? null : null

  const { error } = await supabase
    .from('negocios')
    .update({ destaque_ativo: ativo, destaque_expira_em: destaqueExpiraEm })
    .eq('id', negocioId)

  if (error) return { erro: error.message }

  await auditar(user.id, ativo ? 'destaque.ativar_manual' : 'destaque.desativar_manual', 'negocio', negocioId, { dias: dias ?? null })

  revalidatePath('/painel/admin/negocios')
  revalidatePath('/buscar')
  return { erro: null }
}

export async function criarVaga(formData: FormData) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const { error } = await supabase.from('vagas').insert({
    titulo: formData.get('titulo') as string,
    empresa_nome: formData.get('empresa_nome') as string,
    descricao: formData.get('descricao') as string,
    area: formData.get('area') as string,
    tipo_contrato: formData.get('tipo_contrato') as string,
    salario_faixa: formData.get('salario_faixa') as string,
    bairro: formData.get('bairro') as string,
    contato_whatsapp: formData.get('contato_whatsapp') as string,
    publicado_por: user.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/vagas')
  revalidatePath('/vagas')
  return { erro: null }
}

export async function encerrarVaga(vagaId: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase } = auth

  const { error } = await supabase
    .from('vagas')
    .update({ status: 'encerrada' })
    .eq('id', vagaId)

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/vagas')
  revalidatePath('/vagas')
  return { erro: null }
}


export async function criarAviso(formData: FormData) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase, user } = auth

  const dataEvento = formData.get('data_evento') as string
  const tipo = formData.get('tipo') as string
  const titulo = formData.get('titulo') as string

  const { error } = await supabase.from('avisos_cidade').insert({
    tipo,
    titulo,
    conteudo: formData.get('conteudo') as string,
    local_evento: formData.get('local_evento') as string,
    // datetime-local vem sem fuso: é horário de Tanguá (sem isso o banco gravava como UTC, 3h antes)
    data_evento: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dataEvento ?? '') ? new Date(`${dataEvento}:00-03:00`).toISOString() : null,
    fixado: formData.get('fixado') === 'on',
    publicado_por: user.id,
  })

  if (error) return { erro: error.message }

  const rotulosTipo: Record<string, string> = {
    aviso: 'Novo aviso',
    evento: 'Novo evento',
    utilidade_publica: 'Utilidade pública',
    achados_perdidos: 'Achados e perdidos',
  }
  // mural vai pra todo mundo com push ativo (respeitando quem desligou "mural");
  // não grava no sino do app de cada usuário pra não multiplicar linhas.
  const { data: inscritos } = await createServiceClient().from('push_subscriptions').select('perfil_id').not('perfil_id', 'is', null)
  const aviso = {
    tipo: 'mural',
    titulo: `${rotulosTipo[tipo] || 'Novidade'} em Tanguá`,
    corpo: titulo,
    url: tipo === 'evento' ? '/agenda' : '/mural',
  }
  await notificar(Array.from(new Set((inscritos ?? []).map((i) => i.perfil_id as string))), aviso, { categoria: 'mural', noApp: false })
  // e quem ativou notificação sem ter conta (fora do horário silencioso)
  if (!horarioSilencioso()) await enviarNotificacaoParaVisitantes({ title: aviso.titulo, body: aviso.corpo, url: aviso.url, tag: 'mural' })

  revalidatePath('/painel/admin/avisos')
  revalidatePath('/mural')
  return { erro: null }
}

export async function removerAviso(avisoId: string) {
  const auth = await requireAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const { supabase } = auth

  const { error } = await supabase
    .from('avisos_cidade')
    .update({ ativo: false })
    .eq('id', avisoId)

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/avisos')
  revalidatePath('/mural')
  return { erro: null }
}


