'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { notificar } from '@/lib/notificacoes/notificar'
import { caminhoInternoSeguro } from '@/lib/site'

/** Ações do admin: usuários, categorias, verificação e comunicados. Tudo auditado. */

async function auditar(atorId: string, acao: string, entidade: string, entidadeId: string, dados: Record<string, unknown> = {}) {
  await createServiceClient()
    .from('registros_auditoria')
    .insert({ ator_id: atorId, acao, entidade, entidade_id: entidadeId, dados })
    .then(
      () => undefined,
      () => undefined
    )
}

const uuid = (v: unknown) => z.string().uuid().safeParse(v).success

// --- usuários ---------------------------------------------------------

/**
 * Suspender = bloqueia o login no Supabase Auth (ban) e marca o perfil.
 * Reativar desfaz os dois. Admin não suspende a si mesmo.
 */
export async function suspenderUsuario(perfilId: string, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(perfilId)) return { erro: 'Usuário inválido.' }
  if (perfilId === auth.user.id) return { erro: 'Você não pode suspender a própria conta.' }
  const motivo = String(formData.get('motivo') ?? '').trim().slice(0, 300)
  if (motivo.length < 5) return { erro: 'Escreva o motivo (fica no registro de auditoria).' }

  const db = createServiceClient()
  const { error: erroAuth } = await db.auth.admin.updateUserById(perfilId, { ban_duration: '876000h' })
  if (erroAuth) return { erro: `Não foi possível bloquear o login: ${erroAuth.message}` }
  await db.from('perfis').update({ suspenso_em: new Date().toISOString(), motivo_suspensao: motivo }).eq('id', perfilId)
  await auditar(auth.user.id, 'suspender_usuario', 'perfil', perfilId, { motivo })
  revalidatePath('/painel/admin/usuarios')
  return { erro: null }
}

export async function reativarUsuario(perfilId: string) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(perfilId)) return { erro: 'Usuário inválido.' }
  const db = createServiceClient()
  const { error } = await db.auth.admin.updateUserById(perfilId, { ban_duration: 'none' })
  if (error) return { erro: `Não foi possível liberar o login: ${error.message}` }
  await db.from('perfis').update({ suspenso_em: null, motivo_suspensao: null }).eq('id', perfilId)
  await auditar(auth.user.id, 'reativar_usuario', 'perfil', perfilId)
  revalidatePath('/painel/admin/usuarios')
  return { erro: null }
}

// --- verificação de negócio ------------------------------------------

export async function alternarVerificado(negocioId: string, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(negocioId)) return { erro: 'Negócio inválido.' }
  const verificar = formData.get('verificado') === 'on'
  const nota = String(formData.get('nota') ?? '').trim().slice(0, 300) || null
  const db = createServiceClient()
  const { data: negocio, error } = await db
    .from('negocios')
    .update({ verificado: verificar, verificado_em: verificar ? new Date().toISOString() : null, verificacao_nota: verificar ? nota : null })
    .eq('id', negocioId)
    .select('nome, reivindicado_por')
    .single()
  if (error) return { erro: error.message }
  await auditar(auth.user.id, verificar ? 'verificar_negocio' : 'remover_verificacao', 'negocio', negocioId, { nota })
  if (verificar && negocio?.reivindicado_por) {
    await notificar([negocio.reivindicado_por], {
      tipo: 'negocio_verificado',
      titulo: 'Seu negócio ganhou o selo Verificado',
      corpo: `${negocio.nome} agora aparece com o selo e sobe na busca.`,
      url: '/painel/negocio',
    })
  }
  revalidatePath('/painel/admin/negocios')
  return { erro: null }
}

// --- categorias --------------------------------------------------------

const schemaCategoria = z.object({
  nome: z.string().trim().min(2, 'Nome muito curto.').max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, 'Endereço só com letras minúsculas, números e hífen (ex: casa-construcao).'),
  icone: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,40}$/, 'Ícone: nome do Lucide em minúsculas (ex: scissors).')
    .optional(),
  ordem: z.coerce.number().int().min(0).max(999),
})

export async function salvarCategoria(categoriaId: string | null, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const v = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    slug: formData.get('slug'),
    icone: formData.get('icone') || undefined,
    ordem: formData.get('ordem') || 0,
  })
  if (!v.success) return { erro: v.error.issues[0].message }
  const db = createServiceClient()
  const dados = { nome: v.data.nome, slug: v.data.slug, icone: v.data.icone || null, ordem: v.data.ordem }
  const { data, error } = categoriaId
    ? await db.from('categorias').update(dados).eq('id', categoriaId).select('id').single()
    : await db.from('categorias').insert(dados).select('id').single()
  if (error) return { erro: error.code === '23505' ? 'Já existe uma categoria com esse endereço.' : error.message }
  await auditar(auth.user.id, categoriaId ? 'editar_categoria' : 'criar_categoria', 'categoria', data.id, dados)
  revalidatePath('/painel/admin/categorias')
  revalidatePath('/')
  return { erro: null }
}

export async function removerCategoria(categoriaId: string) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(categoriaId)) return { erro: 'Categoria inválida.' }
  const db = createServiceClient()
  const { count } = await db.from('negocios').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId)
  if ((count ?? 0) > 0) return { erro: `${count} negócio(s) usam essa categoria. Mude a categoria deles antes de apagar.` }
  const { error } = await db.from('categorias').delete().eq('id', categoriaId)
  if (error) return { erro: error.message }
  await auditar(auth.user.id, 'remover_categoria', 'categoria', categoriaId)
  revalidatePath('/painel/admin/categorias')
  return { erro: null }
}

// --- comunicados segmentados ---------------------------------------------

const PUBLICOS = ['todos', 'moradores', 'lojistas', 'bairro', 'sem_negocio_completo'] as const

export async function enviarComunicado(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const publico = String(formData.get('publico') ?? '')
  if (!(PUBLICOS as readonly string[]).includes(publico)) return { erro: 'Escolha o público.' }
  const titulo = String(formData.get('titulo') ?? '').trim()
  const corpo = String(formData.get('corpo') ?? '').trim()
  if (titulo.length < 3 || titulo.length > 120) return { erro: 'Título entre 3 e 120 letras.' }
  if (corpo.length > 400) return { erro: 'Texto com no máximo 400 letras.' }
  const urlBruta = String(formData.get('url') ?? '').trim()
  const url = urlBruta ? caminhoInternoSeguro(urlBruta, '') : ''
  if (urlBruta && !url) return { erro: 'O link precisa ser uma página do app, começando com / (ex: /ofertas).' }
  const bairro = String(formData.get('bairro') ?? '').trim()
  if (publico === 'bairro' && !bairro) return { erro: 'Informe o bairro.' }

  const db = createServiceClient()
  let ids: string[] = []
  if (publico === 'lojistas' || publico === 'sem_negocio_completo') {
    const { data } = await db.from('negocios').select('reivindicado_por, descricao, foto_capa_url').not('reivindicado_por', 'is', null).eq('ativo', true)
    ids = (data ?? [])
      .filter((n) => publico === 'lojistas' || !n.descricao || !n.foto_capa_url)
      .map((n) => n.reivindicado_por as string)
  } else {
    let q = db.from('perfis').select('id').is('suspenso_em', null)
    if (publico === 'moradores') q = q.eq('papel', 'morador')
    if (publico === 'bairro') q = q.eq('bairro', bairro)
    const { data } = await q.limit(20000)
    ids = (data ?? []).map((p) => p.id as string)
  }
  ids = Array.from(new Set(ids))
  if (ids.length === 0) return { erro: 'Ninguém nesse público.' }

  // lojista recebe como aviso da conta; público geral pode desligar (categoria mural)
  const paraLojista = publico === 'lojistas' || publico === 'sem_negocio_completo'
  await notificar(ids, { tipo: 'comunicado', titulo, corpo: corpo || undefined, url: url || undefined }, paraLojista ? {} : { categoria: 'mural' })
  await auditar(auth.user.id, 'enviar_comunicado', 'comunicado', crypto.randomUUID(), { publico, bairro: bairro || null, titulo, total: ids.length })
  return { erro: null, total: ids.length }
}
