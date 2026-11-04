'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { chaveNome, chaveTelefone } from '@/lib/negocios/duplicados'

const uuid = z.string().uuid()

/** O que já está ligado a um negócio: se tiver algo, ele não é apagado (só ocultado). */
async function vinculosDoNegocio(db: ReturnType<typeof createServiceClient>, negocioId: string) {
  const contar = async (tabela: string) => {
    const { count } = await db.from(tabela).select('*', { count: 'exact', head: true }).eq('negocio_id', negocioId)
    return count ?? 0
  }
  const [avaliacoes, favoritos, produtos, novidades, ofertas, assinaturas, compras] = await Promise.all([
    contar('avaliacoes'),
    contar('favoritos'),
    contar('produtos_servicos'),
    contar('posts_negocio'),
    contar('cupons'),
    contar('assinaturas'),
    contar('compras_servicos'),
  ])
  return { avaliacoes, favoritos, produtos, novidades, ofertas, assinaturas, compras }
}

async function carregarPar(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' } as const
  const removerId = String(formData.get('negocio_id') ?? '')
  const manterId = String(formData.get('manter_id') ?? '')
  if (!uuid.safeParse(removerId).success || !uuid.safeParse(manterId).success || removerId === manterId) return { erro: 'Escolha qual perfil fica.' } as const
  if (formData.get('confirmar') !== 'sim') return { erro: 'Marque a confirmação antes.' } as const

  const db = createServiceClient()
  const { data } = await db.from('negocios').select('*').in('id', [removerId, manterId])
  const remover = data?.find((n) => n.id === removerId)
  const manter = data?.find((n) => n.id === manterId)
  if (!remover || !manter) return { erro: 'Negócio não encontrado (talvez já tenha sido removido).' } as const

  // só mexe se os dois são mesmo parecidos (mesmo nome ou mesmo telefone)
  const telefones = (n: Record<string, unknown>) => [chaveTelefone(n.whatsapp as string), chaveTelefone(n.telefone as string)].filter(Boolean)
  const mesmoNome = chaveNome(remover.nome) === chaveNome(manter.nome)
  const mesmoTelefone = telefones(remover).some((t) => telefones(manter).includes(t))
  if (!mesmoNome && !mesmoTelefone) return { erro: 'Esses dois perfis não têm o mesmo nome nem o mesmo telefone.' } as const

  return { auth, db, remover, manter } as const
}

/**
 * Apaga o perfil repetido. Só quando ele está vazio (sem avaliação,
 * favorito, produto, novidade, oferta, assinatura ou compra): assim nada
 * de ninguém se perde. O registro completo fica na Auditoria.
 */
export async function apagarRepetido(formData: FormData) {
  const r = await carregarPar(formData)
  if ('erro' in r) return { erro: r.erro }
  const { auth, db, remover, manter } = r

  const v = await vinculosDoNegocio(db, remover.id)
  const usados = Object.entries(v).filter(([, n]) => n > 0)
  if (usados.length) {
    return { erro: `Este perfil já tem ${usados.map(([k, n]) => `${n} ${k}`).join(', ')}. Para não perder nada, use "Ocultar" em vez de apagar.` }
  }

  await db.from('registros_auditoria').insert({
    ator_id: auth.user.id,
    acao: 'negocio.apagar_repetido',
    entidade: 'negocio',
    entidade_id: remover.id,
    dados: { mantido: { id: manter.id, nome: manter.nome }, apagado: remover },
  })
  const { error } = await db.from('negocios').delete().eq('id', remover.id)
  if (error) return { erro: 'Não foi possível apagar agora. Tente de novo.' }
  revalidatePath('/painel/admin/repetidos')
  revalidatePath('/buscar')
  revalidatePath('/')
  return { erro: null }
}

/** Tira o repetido do app sem apagar nada (some da busca e do perfil público). */
export async function ocultarRepetido(formData: FormData) {
  const r = await carregarPar(formData)
  if ('erro' in r) return { erro: r.erro }
  const { auth, db, remover, manter } = r
  const { error } = await db
    .from('negocios')
    .update({ ativo: false, pausado_em: new Date().toISOString(), motivo_moderacao: `Repetido de "${manter.nome}" (ocultado pela equipe).` })
    .eq('id', remover.id)
  if (error) return { erro: 'Não foi possível ocultar agora. Tente de novo.' }
  await db.from('registros_auditoria').insert({
    ator_id: auth.user.id,
    acao: 'negocio.ocultar_repetido',
    entidade: 'negocio',
    entidade_id: remover.id,
    dados: { mantido: { id: manter.id, nome: manter.nome } },
  })
  revalidatePath('/painel/admin/repetidos')
  revalidatePath('/buscar')
  revalidatePath('/')
  return { erro: null }
}
