'use server'

import { revalidatePath } from 'next/cache'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { interpretarConfig, lerLimite, lerPrecoCentavos, schemaPlano } from '@/lib/admin/configuracoes'
import { CHAVES_RECURSO, type ChaveRecurso } from '@/lib/planos/limites'

/**
 * Configuração do produto pelo painel (sem precisar abrir o banco).
 * Escrita com service role DEPOIS de verificarAdmin(); toda mudança vai pra
 * registros_auditoria com o valor anterior e o novo.
 */

async function auditar(atorId: string, acao: string, entidade: string, entidadeId: string, dados: Record<string, unknown>) {
  await createServiceClient().from('registros_auditoria').insert({ ator_id: atorId, acao, entidade, entidade_id: entidadeId, dados })
}

export async function salvarConfiguracao(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const chave = String(formData.get('chave') ?? '')
  const interpretado = interpretarConfig(chave, String(formData.get('valor') ?? ''))
  if ('erro' in interpretado) return { erro: interpretado.erro }

  const db = createServiceClient()
  const { data: anterior } = await db.from('configuracoes_sistema').select('valor').eq('chave', chave).maybeSingle()
  const { error } = await db
    .from('configuracoes_sistema')
    .update({ valor: interpretado.valor, atualizado_por: auth.user.id, atualizado_em: new Date().toISOString() })
    .eq('chave', chave)
  if (error) return { erro: 'Não foi possível salvar. Confira se a migration 0017 foi aplicada.' }

  await auditar(auth.user.id, 'config.alterar', 'configuracao', chave, { de: anterior?.valor ?? null, para: interpretado.valor })
  revalidatePath('/painel/admin/configuracoes')
  revalidatePath('/', 'layout')
  return { erro: null }
}

export async function salvarPlano(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }

  const bruto = {
    id: String(formData.get('id') ?? '').trim(),
    nome: String(formData.get('nome') ?? ''),
    descricao: String(formData.get('descricao') ?? ''),
    preco_centavos: lerPrecoCentavos(formData.get('preco')),
    ativo: formData.get('ativo') === 'on',
    ordem: Number(formData.get('ordem') ?? 0),
    limites: {
      max_produtos: lerLimite(formData.get('max_produtos')),
      max_cupons_ativos: lerLimite(formData.get('max_cupons_ativos')),
      max_posts_mes: lerLimite(formData.get('max_posts_mes')),
      max_fotos_galeria: lerLimite(formData.get('max_fotos_galeria')),
    },
    recursos: Object.fromEntries(CHAVES_RECURSO.map((c) => [c, formData.get(c) === 'on'])),
  }
  const validado = schemaPlano.safeParse(bruto)
  if (!validado.success) {
    const problema = validado.error.issues[0]
    return { erro: `${problema.path.join('.') || 'plano'}: ${problema.message}` }
  }
  const plano = validado.data

  const db = createServiceClient()
  const { data: anterior } = await db.from('planos').select('*').eq('id', plano.id).maybeSingle()

  if (plano.id === 'gratuito' && (plano.preco_centavos !== 0 || !plano.ativo)) {
    return { erro: 'O plano Gratuito precisa continuar ativo e com preço zero — é o plano de quem não paga.' }
  }

  // mudança de preço é ação de alto impacto: exige confirmação explícita
  const mudouPreco = anterior && anterior.preco_centavos !== plano.preco_centavos
  if (mudouPreco && formData.get('confirmo_preco') !== 'on') {
    return {
      erro: 'Marque a confirmação de mudança de preço. O novo valor vale só pra novas contratações; quem já assina continua pagando o valor contratado.',
    }
  }

  const { error } = await db.from('planos').upsert({ ...plano, atualizado_em: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return { erro: 'Não foi possível salvar o plano.' }

  await auditar(auth.user.id, anterior ? 'plano.alterar' : 'plano.criar', 'plano', plano.id, { de: anterior ?? null, para: plano })
  revalidatePath('/painel/admin/planos')
  revalidatePath('/planos')
  return { erro: null }
}

/** Liga/desliga um recurso de um plano com um toque (grade de Planos e recursos). */
export async function alternarRecursoPlano(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const planoId = String(formData.get('plano_id') ?? '')
  const chave = String(formData.get('recurso') ?? '') as ChaveRecurso
  if (!CHAVES_RECURSO.includes(chave)) return { erro: 'Recurso desconhecido.' }
  const db = createServiceClient()
  const { data: plano } = await db.from('planos').select('recursos').eq('id', planoId).maybeSingle()
  if (!plano) return { erro: 'Plano não encontrado.' }
  const antes = plano.recursos?.[chave] === true
  const recursos = { ...(plano.recursos ?? {}), [chave]: !antes }
  const { error } = await db.from('planos').update({ recursos, atualizado_em: new Date().toISOString() }).eq('id', planoId)
  if (error) return { erro: 'Não foi possível salvar.' }
  await auditar(auth.user.id, 'plano.recurso', 'plano', planoId, { recurso: chave, de: antes, para: !antes })
  revalidatePath('/painel/admin/planos')
  revalidatePath('/planos')
  return { erro: null }
}

/** Liga/desliga partes inteiras do app (Admin → Recursos do app). */
export async function alternarModulo(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const modulo = String(formData.get('modulo') ?? '')
  if (!/^[a-z_]{2,40}$/.test(modulo)) return { erro: 'Módulo inválido.' }
  const db = createServiceClient()
  const { data } = await db.from('configuracoes_sistema').select('valor').eq('chave', 'modulos_ativos').maybeSingle()
  const atual = (data?.valor ?? {}) as Record<string, boolean>
  const novo = { ...atual, [modulo]: atual[modulo] === false }
  const { error } = await db
    .from('configuracoes_sistema')
    .upsert({ chave: 'modulos_ativos', valor: novo, publico: true, atualizado_por: auth.user.id, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
  if (error) return { erro: 'Não foi possível salvar.' }
  await auditar(auth.user.id, 'config.modulo', 'configuracao', 'modulos_ativos', { modulo, ligado: novo[modulo] })
  revalidatePath('/', 'layout')
  return { erro: null }
}
