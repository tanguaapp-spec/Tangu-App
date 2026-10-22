'use server'

import { createHash } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite } from '@/lib/seguranca/rate-limit'
import { clienteMercadoPago, mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'
import { CATEGORIAS_OPCIONAIS } from '@/lib/notificacoes/notificar'

export async function salvarPreferenciasComunicacao(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta.' }

  const preferencias = Object.fromEntries(Object.keys(CATEGORIAS_OPCIONAIS).map((c) => [c, formData.get(c) === 'on']))
  const { error } = await supabase
    .from('perfis')
    .update({ preferencias_notificacao: preferencias, notificacoes_resumo_diario: formData.get('resumo_diario') === 'on' })
    .eq('id', user.id)
  if (error) return { erro: 'Não foi possível salvar agora.' }

  revalidatePath('/perfil')
  return { erro: null }
}

export async function marcarNotificacoesLidas() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: null }
  await supabase.from('notificacoes').update({ lida_em: new Date().toISOString() }).eq('perfil_id', user.id).is('lida_em', null)
  revalidatePath('/notificacoes')
  return { erro: null }
}

/** Confere a senha sem mexer nos cookies da sessão atual. */
async function senhaConfere(email: string, senha: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url || !chave) return false
  const isolado = createSupabaseClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await isolado.auth.signInWithPassword({ email, password: senha })
  if (!error) await isolado.auth.signOut().catch(() => undefined)
  return !error
}

async function removerPasta(prefixo: string) {
  const storage = createServiceClient().storage.from('imagens')
  for (let rodada = 0; rodada < 20; rodada++) {
    const { data: itens } = await storage.list(prefixo, { limit: 100 })
    if (!itens || itens.length === 0) return
    const arquivos = itens.filter((i) => i.id).map((i) => `${prefixo}/${i.name}`)
    const pastas = itens.filter((i) => !i.id).map((i) => `${prefixo}/${i.name}`)
    if (arquivos.length) await storage.remove(arquivos)
    for (const p of pastas) await removerPasta(p)
    if (arquivos.length === 0) return
  }
}

/**
 * Exclusão definitiva da conta (LGPD art. 18, VI). Pede a senha de novo e a
 * palavra EXCLUIR. Ordem: cancela cobrança → tira negócio do ar → apaga
 * fotos → apaga o usuário (perfil e dados pessoais caem em cascata).
 * Pagamentos ficam (obrigação fiscal), sem vínculo com a pessoa.
 */
export async function excluirConta(formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { erro: 'Entre na sua conta.' }

  if (String(formData.get('confirmacao') ?? '').trim().toUpperCase() !== 'EXCLUIR') {
    return { erro: 'Digite EXCLUIR pra confirmar.' }
  }
  if (!(await dentroDoLimite(`excluir-conta:${user.id}`, 5, 60 * 60))) {
    return { erro: 'Muitas tentativas. Aguarde um pouco.' }
  }
  if (!(await senhaConfere(user.email, String(formData.get('senha') ?? '')))) {
    return { erro: 'Senha incorreta.' }
  }

  const admin = createServiceClient()
  const { data: negocio } = await admin.from('negocios').select('id').eq('reivindicado_por', user.id).maybeSingle()

  try {
    if (negocio) {
      const { data: abertas } = await admin
        .from('assinaturas')
        .select('id, provedor_assinatura_id')
        .eq('negocio_id', negocio.id)
        .in('status', ['pendente', 'ativa', 'em_atraso'])
      for (const a of abertas ?? []) {
        if (a.provedor_assinatura_id && mercadoPagoConfigurado()) {
          await clienteMercadoPago.cancelarAssinatura(a.provedor_assinatura_id)
        }
        await admin.from('assinaturas').update({ status: 'expirada', cancelada_em: new Date().toISOString() }).eq('id', a.id)
      }
      await admin.from('negocios').update({ ativo: false, destaque_ativo: false }).eq('id', negocio.id)
      await removerPasta(`negocios/${negocio.id}`)
    }
    await removerPasta(`usuarios/${user.id}`)
  } catch (err) {
    await registrarErro({ mensagem: `Falha na preparação da exclusão de conta: ${(err as Error).message}`, contexto: 'excluirConta' })
    return { erro: 'Não conseguimos cancelar sua assinatura no Mercado Pago agora. Nada foi apagado — tente de novo em instantes.' }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    await registrarErro({ mensagem: `Falha ao excluir usuário: ${error.message}`, contexto: 'excluirConta' })
    return { erro: 'Não foi possível concluir a exclusão. Abra um chamado em Ajuda que a equipe resolve.' }
  }

  await admin.from('registros_auditoria').insert({
    acao: 'conta.excluir',
    entidade: 'perfil',
    // identificador irreversível: prova que aconteceu, sem guardar quem era
    entidade_id: createHash('sha256').update(user.id).digest('hex').slice(0, 16),
    dados: { tinha_negocio: !!negocio },
  })

  await supabase.auth.signOut().catch(() => undefined)
  redirect('/?conta=excluida')
}
