'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { horarioSilencioso, notificar } from '@/lib/notificacoes/notificar'
import { enviarNotificacaoParaVisitantes } from '@/lib/push/enviar-notificacao'
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
  nome: z.string().trim().min(2, 'Nome muito curto.').max(60, 'Nome muito longo.'),
  icone: z.string().trim().regex(/^[a-z0-9-]{1,40}$/).optional(),
  parent_id: z.string().uuid().nullable(),
})

/** "Açaí e sorveterias" → "acai-e-sorveterias" */
function slugCategoria(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function revalidarCategorias() {
  revalidatePath('/painel/admin/categorias')
  revalidatePath('/', 'layout')
}

/**
 * Criar/editar categoria só com nome, ícone e (opcional) categoria-mãe.
 * O endereço (/categoria/...) é gerado do nome ao criar e não muda depois,
 * pra não quebrar link já compartilhado.
 */
export async function salvarCategoria(categoriaId: string | null, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const mae = String(formData.get('parent_id') ?? '')
  const v = schemaCategoria.safeParse({
    nome: formData.get('nome'),
    icone: formData.get('icone') || undefined,
    parent_id: mae || null,
  })
  if (!v.success) return { erro: v.error.issues[0].message }
  const db = createServiceClient()
  if (v.data.parent_id) {
    if (v.data.parent_id === categoriaId) return { erro: 'Uma categoria não pode ser mãe dela mesma.' }
    const { data: m } = await db.from('categorias').select('parent_id').eq('id', v.data.parent_id).maybeSingle()
    if (!m) return { erro: 'Categoria-mãe não encontrada.' }
    if (m.parent_id) return { erro: 'Escolha uma categoria principal como mãe (subcategoria não tem filhas).' }
    if (categoriaId) {
      const { count } = await db.from('categorias').select('id', { count: 'exact', head: true }).eq('parent_id', categoriaId)
      if (count) return { erro: 'Esta categoria tem subcategorias; ela precisa continuar principal.' }
    }
  }
  const dados: Record<string, unknown> = { nome: v.data.nome, icone: v.data.icone ?? 'store', parent_id: v.data.parent_id }
  let resposta
  if (categoriaId) {
    resposta = await db.from('categorias').update(dados).eq('id', categoriaId).select('id').single()
  } else {
    const base = slugCategoria(v.data.nome)
    if (base.length < 2) return { erro: 'Use um nome com letras.' }
    const { data: ultima } = await db.from('categorias').select('ordem').order('ordem', { ascending: false }).limit(1).maybeSingle()
    let slug = base
    for (let i = 2; i < 50; i++) {
      const { count } = await db.from('categorias').select('id', { count: 'exact', head: true }).eq('slug', slug)
      if (!count) break
      slug = `${base}-${i}`
    }
    resposta = await db.from('categorias').insert({ ...dados, slug, ordem: (ultima?.ordem ?? 0) + 1 }).select('id').single()
  }
  if (resposta.error) return { erro: resposta.error.code === '23505' ? 'Já existe uma categoria com esse nome.' : 'Não foi possível salvar.' }
  await auditar(auth.user.id, categoriaId ? 'editar_categoria' : 'criar_categoria', 'categoria', resposta.data.id, dados)
  revalidarCategorias()
  return { erro: null }
}

/** Liga/desliga "ativa" ou "atalho na página inicial" com um toque. */
export async function alternarCampoCategoria(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const campo = String(formData.get('campo') ?? '')
  if (!uuid(id) || !['ativo', 'mostrar_inicio'].includes(campo)) return { erro: 'Pedido inválido.' }
  const db = createServiceClient()
  const { data } = await db.from('categorias').select('ativo, mostrar_inicio').eq('id', id).maybeSingle()
  if (!data) return { erro: 'Categoria não encontrada.' }
  const valor = !(data as Record<string, boolean>)[campo]
  const { error } = await db.from('categorias').update({ [campo]: valor }).eq('id', id)
  if (error) return { erro: 'Não foi possível salvar.' }
  await auditar(auth.user.id, `categoria_${campo}`, 'categoria', id, { [campo]: valor })
  revalidarCategorias()
  return { erro: null }
}

/** Sobe ou desce na ordem (troca de lugar com a vizinha do mesmo nível). */
export async function moverCategoria(categoriaId: string, direcao: 'subir' | 'descer') {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(categoriaId)) return { erro: 'Categoria inválida.' }
  const db = createServiceClient()
  const { data: atual } = await db.from('categorias').select('id, ordem, parent_id').eq('id', categoriaId).maybeSingle()
  if (!atual) return { erro: 'Categoria não encontrada.' }
  let q = db.from('categorias').select('id, ordem')
  q = atual.parent_id ? q.eq('parent_id', atual.parent_id) : q.is('parent_id', null)
  q = direcao === 'subir' ? q.lt('ordem', atual.ordem).order('ordem', { ascending: false }) : q.gt('ordem', atual.ordem).order('ordem')
  const { data: vizinha } = await q.limit(1).maybeSingle()
  if (!vizinha) return { erro: null }
  await db.from('categorias').update({ ordem: vizinha.ordem }).eq('id', atual.id)
  await db.from('categorias').update({ ordem: atual.ordem }).eq('id', vizinha.id)
  revalidarCategorias()
  return { erro: null }
}

export async function removerCategoria(categoriaId: string) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(categoriaId)) return { erro: 'Categoria inválida.' }
  const db = createServiceClient()
  const [{ count }, { count: filhas }] = await Promise.all([
    db.from('negocios').select('id', { count: 'exact', head: true }).eq('categoria_id', categoriaId),
    db.from('categorias').select('id', { count: 'exact', head: true }).eq('parent_id', categoriaId),
  ])
  if ((count ?? 0) > 0) return { erro: `${count} negócio(s) usam essa categoria. Mude a categoria deles antes de apagar, ou só desative.` }
  if ((filhas ?? 0) > 0) return { erro: 'Ela tem subcategorias. Apague ou mova as subcategorias antes.' }
  const { error } = await db.from('categorias').delete().eq('id', categoriaId)
  if (error) return { erro: 'Não foi possível apagar.' }
  await auditar(auth.user.id, 'remover_categoria', 'categoria', categoriaId)
  revalidarCategorias()
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
  // "Todo mundo" inclui quem ativou notificação sem ter conta
  if (publico === 'todos' && !horarioSilencioso()) await enviarNotificacaoParaVisitantes({ title: titulo, body: corpo, url: url || '/', tag: 'comunicado' })
  await auditar(auth.user.id, 'enviar_comunicado', 'comunicado', crypto.randomUUID(), { publico, bairro: bairro || null, titulo, total: ids.length })
  return { erro: null, total: ids.length }
}

// --- equipe de crescimento (0026) ---------------------------------------

/** Dá ou tira o acesso "crescimento" (Crescimento + Leads) pelo e-mail da conta. */
export async function alterarAcessoCrescimento(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const acao = formData.get('acao') === 'remover' ? 'remover' : 'conceder'
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { erro: 'Digite o e-mail da conta da pessoa.' }
  const db = createServiceClient()
  let perfilId: string | null = null
  for (let pagina = 1; pagina <= 30 && !perfilId; pagina++) {
    const { data, error } = await db.auth.admin.listUsers({ page: pagina, perPage: 1000 })
    if (error) return { erro: 'Não foi possível procurar a conta agora.' }
    perfilId = data.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null
    if (data.users.length < 1000) break
  }
  if (!perfilId) return { erro: 'Nenhuma conta com esse e-mail. A pessoa precisa se cadastrar no app primeiro.' }
  const { error } =
    acao === 'conceder'
      ? await db.from('equipe_plataforma').upsert({ perfil_id: perfilId, papel: 'crescimento', concedido_por: auth.user.id }, { onConflict: 'perfil_id' })
      : await db.from('equipe_plataforma').delete().eq('perfil_id', perfilId)
  if (error) return { erro: 'Não foi possível salvar (a migration 0026 já rodou?).' }
  await auditar(auth.user.id, `crescimento_${acao}`, 'perfil', perfilId, { email })
  revalidatePath('/painel/admin/usuarios')
  return { erro: null }
}

// --- edição de negócio pelo admin -------------------------------------------

const DIAS_ADMIN = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'] as const

/**
 * Admin corrige os dados de qualquer negócio (útil nos importados, que
 * ainda não têm dono). Fica na auditoria com o antes e o depois.
 */
export async function salvarNegocioAdmin(negocioId: string, formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  if (!uuid(negocioId)) return { erro: 'Negócio inválido.' }
  const texto = (c: string, max: number) => String(formData.get(c) ?? '').trim().slice(0, max) || null
  const nome = texto('nome', 120)
  if (!nome || nome.length < 2) return { erro: 'Informe o nome.' }
  const categoriaId = texto('categoria_id', 36)
  if (categoriaId && !uuid(categoriaId)) return { erro: 'Categoria inválida.' }
  const digitos = (c: string) => {
    const d = (texto(c, 30) ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
    return d ? (d.length === 10 || d.length === 11 ? d : false) : null
  }
  const whatsapp = digitos('whatsapp')
  const telefone = digitos('telefone')
  if (whatsapp === false || telefone === false) return { erro: 'Telefone/WhatsApp com DDD: 10 ou 11 números.' }
  const horario: Record<string, string> = {}
  for (const d of DIAS_ADMIN) {
    const v = texto(`horario_${d}`, 40)
    if (v) horario[d] = v
  }
  const dados = {
    nome,
    categoria_id: categoriaId,
    descricao: texto('descricao', 2000),
    whatsapp,
    telefone,
    endereco: texto('endereco', 200),
    bairro: texto('bairro', 100),
    horario_funcionamento: Object.keys(horario).length ? horario : null,
    ativo: formData.get('ativo') === 'on',
  }
  const db = createServiceClient()
  const { data: antes } = await db.from('negocios').select('nome, categoria_id, descricao, whatsapp, telefone, endereco, bairro, horario_funcionamento, ativo, slug').eq('id', negocioId).maybeSingle()
  if (!antes) return { erro: 'Negócio não encontrado.' }
  const { error } = await db.from('negocios').update(dados).eq('id', negocioId)
  if (error) return { erro: 'Não foi possível salvar.' }
  await auditar(auth.user.id, 'negocio.editar_admin', 'negocio', negocioId, { antes, depois: dados })
  revalidatePath(`/negocio/${antes.slug ?? negocioId}`)
  revalidatePath('/painel/admin/negocios')
  return { erro: null }
}
