'use server'

import { revalidatePath } from 'next/cache'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { bairroCanonico, converterHorarios, enderecoCurto, lerArquivoLista, limparTelefone, mapearCategoria, normalizar } from '@/lib/importacao/listas'

export type RelatorioImportacao = {
  erro: string | null
  simulacao: boolean
  lidas: number
  novos: number
  atualizados: number
  jaExistem: number
  reivindicados: number
  servicosUteis: number
  ignorados: { nome: string; motivo: string }[]
  porCategoria: Record<string, number>
  exemplos: { nome: string; categoria: string; bairro: string | null; telefone: string | null }[]
}

const vazio = (simulacao: boolean): RelatorioImportacao => ({
  erro: null,
  simulacao,
  lidas: 0,
  novos: 0,
  atualizados: 0,
  jaExistem: 0,
  reivindicados: 0,
  servicosUteis: 0,
  ignorados: [],
  porCategoria: {},
  exemplos: [],
})

/**
 * Importa a lista de comércios como perfis NÃO reivindicados (como o
 * BoraAli). Primeiro roda em simulação (nada é gravado); só grava com
 * "importar". Reimportar atualiza pelo identificador da lista e nunca
 * mexe em perfil que o dono já assumiu.
 */
export async function importarLista(formData: FormData): Promise<RelatorioImportacao> {
  const auth = await verificarAdmin()
  const simulacao = formData.get('acao') !== 'importar'
  const r = vazio(simulacao)
  if ('erro' in auth) return { ...r, erro: auth.erro ?? 'Acesso negado.' }

  const arquivo = formData.get('arquivo') as File | null
  if (!arquivo || arquivo.size === 0) return { ...r, erro: 'Escolha o arquivo da lista (.json ou .csv).' }
  if (arquivo.size > 3_000_000) return { ...r, erro: 'Arquivo grande demais (máximo 3 MB).' }
  let linhas
  try {
    linhas = lerArquivoLista(await arquivo.text())
  } catch {
    return { ...r, erro: 'Não consegui ler o arquivo. Envie o JSON do BoraAli ou um CSV com cabeçalho (nome, categoria, endereco, bairro, telefone, horarios, lat, lng, place_id).' }
  }
  r.lidas = linhas.length
  if (!linhas.length) return { ...r, erro: 'A lista está vazia.' }
  if (linhas.length > 3000) return { ...r, erro: 'Máximo de 3.000 linhas por vez.' }

  const db = createServiceClient()
  const [{ data: categorias }, { data: existentes }, { data: servicos }] = await Promise.all([
    db.from('categorias').select('id, slug, nome'),
    db.from('negocios').select('id, nome, google_place_id, import_ref, reivindicado_por').limit(20000),
    db.from('servicos_uteis').select('nome'),
  ])
  const idCategoria = new Map((categorias ?? []).map((c) => [c.slug as string, c.id as string]))
  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.slug as string, c.nome as string]))
  const porPlace = new Map((existentes ?? []).filter((n) => n.google_place_id).map((n) => [n.google_place_id as string, n]))
  const porRef = new Map((existentes ?? []).filter((n) => n.import_ref).map((n) => [n.import_ref as string, n]))
  const porNome = new Map((existentes ?? []).map((n) => [normalizar(n.nome as string), n]))
  const servicosExistentes = new Set((servicos ?? []).map((s) => normalizar(s.nome as string)))

  const inserir: Record<string, unknown>[] = []
  const atualizar: { id: string; dados: Record<string, unknown> }[] = []
  const novosServicos: Record<string, unknown>[] = []

  for (const l of linhas) {
    if (l.cidade && !normalizar(l.cidade).startsWith('tangua')) {
      r.ignorados.push({ nome: l.nome, motivo: `outra cidade (${l.cidade})` })
      continue
    }
    const destino = mapearCategoria(l.categoria, l.nome)
    if (destino.tipo === 'ignorar') {
      r.ignorados.push({ nome: l.nome, motivo: destino.motivo })
      continue
    }
    const { telefone, whatsapp } = limparTelefone(l.telefone)
    if (destino.tipo === 'servico_util') {
      if (!servicosExistentes.has(normalizar(l.nome))) {
        servicosExistentes.add(normalizar(l.nome))
        novosServicos.push({ categoria: 'prefeitura', nome: l.nome.slice(0, 120), telefone, endereco: enderecoCurto(l.endereco), ordem: 50 })
      }
      r.servicosUteis++
      continue
    }

    const ref = l.place_id ? `lista:${l.place_id}` : `lista:${normalizar(l.nome).replace(/[^a-z0-9]+/g, '-')}`
    const existente = (l.place_id && porPlace.get(l.place_id)) || porRef.get(ref) || porNome.get(normalizar(l.nome))
    const dados = {
      nome: l.nome.slice(0, 120),
      categoria_id: idCategoria.get(destino.categoriaSlug) ?? idCategoria.get('servicos') ?? null,
      endereco: enderecoCurto(l.endereco),
      bairro: bairroCanonico(l.bairro),
      telefone,
      whatsapp,
      horario_funcionamento: converterHorarios(l.horarios),
      latitude: l.lat,
      longitude: l.lng,
    }
    const cat = nomeCategoria.get(destino.categoriaSlug) ?? 'Serviços'
    if (existente) {
      if (existente.reivindicado_por) {
        r.reivindicados++
        continue
      }
      if (existente.import_ref === ref) {
        atualizar.push({ id: existente.id as string, dados })
        r.atualizados++
      } else r.jaExistem++
      continue
    }
    inserir.push({
      ...dados,
      origem: 'importado',
      status_cadastro: 'aprovado',
      ativo: true,
      import_ref: ref,
      google_place_id: l.place_id || null,
    })
    porRef.set(ref, { id: '', nome: l.nome, google_place_id: l.place_id, import_ref: ref, reivindicado_por: null })
    r.novos++
    r.porCategoria[cat] = (r.porCategoria[cat] ?? 0) + 1
    if (r.exemplos.length < 8) r.exemplos.push({ nome: l.nome, categoria: cat, bairro: dados.bairro, telefone })
  }

  if (simulacao) return r

  for (let i = 0; i < inserir.length; i += 100) {
    const { error } = await db.from('negocios').insert(inserir.slice(i, i + 100))
    if (error) return { ...r, erro: `Parou no lote ${i / 100 + 1}: ${error.message}. O que já entrou fica; reimportar não duplica.` }
  }
  for (const a of atualizar) await db.from('negocios').update(a.dados).eq('id', a.id).is('reivindicado_por', null)
  if (novosServicos.length) await db.from('servicos_uteis').insert(novosServicos)

  await db.from('registros_auditoria').insert({
    ator_id: auth.user.id,
    acao: 'importacao.lista',
    entidade: 'negocio',
    dados: { arquivo: arquivo.name, lidas: r.lidas, novos: r.novos, atualizados: r.atualizados, servicos: novosServicos.length, ignorados: r.ignorados.length },
  })
  revalidatePath('/buscar')
  revalidatePath('/painel/admin/importar')
  return r
}

/** Admin decide um pedido do dono para ocultar o perfil criado pela plataforma. */
export async function decidirPedidoOcultar(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const id = String(formData.get('id') ?? '')
  const decisao = formData.get('decisao') === 'ocultar' ? 'ocultado' : 'recusado'
  const db = createServiceClient()
  const { data: p } = await db.from('pedidos_ocultar').select('negocio_id, status').eq('id', id).maybeSingle()
  if (!p || p.status !== 'aberto') return { erro: 'Pedido não encontrado ou já decidido.' }
  if (decisao === 'ocultado') {
    // só perfil sem dono; se alguém assumiu, a decisão é do dono
    await db.from('negocios').update({ ativo: false }).eq('id', p.negocio_id).is('reivindicado_por', null)
  }
  await db.from('pedidos_ocultar').update({ status: decisao, resolvido_por: auth.user.id, resolvido_em: new Date().toISOString() }).eq('id', id)
  await db.from('registros_auditoria').insert({ ator_id: auth.user.id, acao: `ocultar.${decisao}`, entidade: 'negocio', entidade_id: p.negocio_id })
  revalidatePath('/painel/admin/importar')
  revalidatePath('/buscar')
  return { erro: null }
}
