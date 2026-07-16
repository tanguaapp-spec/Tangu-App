'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function aprovarReivindicacao(solicitacaoId: string, negocioId: string, solicitanteId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  await supabase
    .from('negocios')
    .update({ reivindicado_por: solicitanteId, reivindicado_em: new Date().toISOString(), verificado: true })
    .eq('id', negocioId)

  await supabase
    .from('solicitacoes_reivindicacao')
    .update({ status: 'aprovado', revisado_por: user.id, revisado_em: new Date().toISOString() })
    .eq('id', solicitacaoId)

  revalidatePath('/painel/admin/reivindicacoes')
  return { erro: null }
}

export async function rejeitarReivindicacao(solicitacaoId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  await supabase
    .from('solicitacoes_reivindicacao')
    .update({ status: 'rejeitado', revisado_por: user.id, revisado_em: new Date().toISOString() })
    .eq('id', solicitacaoId)

  revalidatePath('/painel/admin/reivindicacoes')
  return { erro: null }
}

export async function criarVaga(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

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
  const supabase = createClient()
  await supabase.from('vagas').update({ status: 'encerrada' }).eq('id', vagaId)
  revalidatePath('/painel/admin/vagas')
  revalidatePath('/vagas')
}

export async function criarAviso(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' }

  const dataEvento = formData.get('data_evento') as string

  const { error } = await supabase.from('avisos_cidade').insert({
    tipo: formData.get('tipo') as string,
    titulo: formData.get('titulo') as string,
    conteudo: formData.get('conteudo') as string,
    local_evento: formData.get('local_evento') as string,
    data_evento: dataEvento || null,
    fixado: formData.get('fixado') === 'on',
    publicado_por: user.id,
  })

  if (error) return { erro: error.message }

  revalidatePath('/painel/admin/avisos')
  revalidatePath('/mural')
  return { erro: null }
}

export async function removerAviso(avisoId: string) {
  const supabase = createClient()
  await supabase.from('avisos_cidade').update({ ativo: false }).eq('id', avisoId)
  revalidatePath('/painel/admin/avisos')
  revalidatePath('/mural')
}
