'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { notificar } from '@/lib/notificacoes/notificar'
import { mesValido, nomeDoMes } from '@/lib/gamificacao/ranking'

const uuid = z.string().uuid()
const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)

const schemaPremio = z.object({
  titulo: z.string().trim().min(3, 'Dê um nome ao prêmio (ex.: Corte de cabelo grátis).').max(120),
  descricao: texto(600),
  parceiro: texto(120),
  negocio_id: z.union([z.literal(''), uuid]).transform((v) => v || null),
  regra: texto(200),
  quantidade: z.union([z.literal(''), z.coerce.number().int().min(1).max(999)]).transform((v) => (v === '' ? null : v)),
})

async function auditar(atorId: string, acao: string, entidadeId: string | null, dados: Record<string, unknown>) {
  await createServiceClient().from('registros_auditoria').insert({ ator_id: atorId, acao, entidade: 'premio', entidade_id: entidadeId, dados })
}

function atualizarTelas() {
  revalidatePath('/painel/admin/engajamento')
  revalidatePath('/premios')
}

/** Cria ou edita um prêmio oferecido por um parceiro. */
export async function salvarPremio(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const v = schemaPremio.safeParse(Object.fromEntries(['titulo', 'descricao', 'parceiro', 'negocio_id', 'regra', 'quantidade'].map((k) => [k, String(formData.get(k) ?? '')])))
  if (!v.success) return { erro: v.error.issues[0].message }
  if (!v.data.parceiro && !v.data.negocio_id) return { erro: 'Informe quem oferece o prêmio (o comércio ou o nome do parceiro).' }

  const db = createServiceClient()
  const id = String(formData.get('id') ?? '')
  if (id) {
    if (!uuid.safeParse(id).success) return { erro: 'Prêmio inválido.' }
    const { error } = await db.from('premios').update(v.data).eq('id', id)
    if (error) return { erro: 'Não foi possível salvar. Confira se a migration 0029 já rodou.' }
    await auditar(auth.user.id, 'premio.editar', id, v.data)
  } else {
    const { data, error } = await db.from('premios').insert({ ...v.data, criado_por: auth.user.id }).select('id').single()
    if (error || !data) return { erro: 'Não foi possível salvar. Confira se a migration 0029 já rodou.' }
    await auditar(auth.user.id, 'premio.criar', data.id, v.data)
  }
  atualizarTelas()
  return { erro: null }
}

/** Mostra ou esconde o prêmio para os moradores (nada é apagado). */
export async function alternarPremio(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const id = String(formData.get('id') ?? '')
  const ativo = formData.get('ativo') === '1'
  if (!uuid.safeParse(id).success) return { erro: 'Prêmio inválido.' }
  await createServiceClient().from('premios').update({ ativo }).eq('id', id)
  await auditar(auth.user.id, ativo ? 'premio.mostrar' : 'premio.esconder', id, {})
  atualizarTelas()
  return { erro: null }
}

/** Dá um prêmio a alguém do ranking do mês. A pessoa é avisada no app e no celular. */
export async function premiarMorador(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const premioId = String(formData.get('premio_id') ?? '')
  const perfilId = String(formData.get('perfil_id') ?? '')
  const mes = String(formData.get('mes') ?? '')
  if (!uuid.safeParse(premioId).success) return { erro: 'Escolha o prêmio.' }
  if (!uuid.safeParse(perfilId).success || !mesValido(mes)) return { erro: 'Dados inválidos.' }

  const db = createServiceClient()
  const { data: premio } = await db.from('premios').select('id, titulo, parceiro, quantidade').eq('id', premioId).maybeSingle()
  if (!premio) return { erro: 'Prêmio não encontrado.' }
  if (premio.quantidade) {
    const { count } = await db.from('premios_ganhadores').select('id', { count: 'exact', head: true }).eq('premio_id', premioId).neq('status', 'cancelado')
    if ((count ?? 0) >= premio.quantidade) return { erro: `Este prêmio já foi dado ${premio.quantidade} vez(es), o total combinado com o parceiro.` }
  }
  const { data: ganhador, error } = await db
    .from('premios_ganhadores')
    .insert({ premio_id: premioId, perfil_id: perfilId, mes: `${mes}-01`, criado_por: auth.user.id })
    .select('id')
    .single()
  if (error?.code === '23505') return { erro: 'Esta pessoa já ganhou este prêmio neste mês.' }
  if (error || !ganhador) return { erro: 'Não foi possível registrar o prêmio.' }

  await notificar([perfilId], {
    tipo: 'premio',
    titulo: 'Você ganhou um prêmio! 🎉',
    corpo: `${premio.titulo}${premio.parceiro ? `, oferecido por ${premio.parceiro}` : ''}, pelo seu engajamento em ${nomeDoMes(mes)}. A gente vai te chamar para combinar a entrega.`,
    url: '/premios',
  })
  await auditar(auth.user.id, 'premio.dar', ganhador.id, { premio: premioId, perfil: perfilId, mes })
  atualizarTelas()
  return { erro: null }
}

/** Marca o prêmio como entregue (ou cancela), com uma anotação opcional. */
export async function atualizarGanhador(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro ?? 'Sem permissão.' }
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!uuid.safeParse(id).success || !['a_entregar', 'entregue', 'cancelado'].includes(status)) return { erro: 'Dados inválidos.' }
  const observacao = String(formData.get('observacao') ?? '').trim().slice(0, 300) || null
  await createServiceClient()
    .from('premios_ganhadores')
    .update({ status, observacao, entregue_em: status === 'entregue' ? new Date().toISOString() : null })
    .eq('id', id)
  await auditar(auth.user.id, `premio.${status}`, id, { observacao })
  atualizarTelas()
  return { erro: null }
}
