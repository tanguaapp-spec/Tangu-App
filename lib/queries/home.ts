import { createPublicClient, createServiceClient } from '@/lib/supabase/server'
import { SECOES_HOME } from '@/lib/admin/configuracoes'
import type { Negocio } from '@/lib/types/database'

/**
 * Dados da página inicial. Cliente público (sem cookies) pra home continuar
 * cacheável (revalidate). A única exceção é "populares", que agrega métricas
 * privadas por negócio com service role e devolve só ids/contagens.
 */

const CAMPOS_NEGOCIO = 'id, nome, bairro, foto_capa_url, destaque_ativo, verificado, tipo_perfil, area_atendimento, modalidades_atendimento, categoria:categorias(nome, slug, icone)'

export type SecaoHome = (typeof SECOES_HOME)[number]

export async function ordemSecoesHome(): Promise<SecaoHome[]> {
  const { data } = await createPublicClient().from('configuracoes_sistema').select('valor').eq('chave', 'home_ordem_secoes').maybeSingle()
  const valor = Array.isArray(data?.valor) ? (data.valor as string[]) : null
  const validas = (valor ?? [...SECOES_HOME]).filter((s): s is SecaoHome => (SECOES_HOME as readonly string[]).includes(s))
  return validas.length ? validas : [...SECOES_HOME]
}

export type OfertaHome = {
  id: string
  titulo: string
  desconto_texto: string
  expira_em: string
  negocio: { id: string; nome: string; bairro: string | null } | null
}

export async function ofertasVigentes(limite = 8): Promise<OfertaHome[]> {
  const { data, error } = await createPublicClient()
    .from('cupons')
    .select('id, titulo, desconto_texto, expira_em, negocio:negocios!inner(id, nome, bairro, ativo, status_cadastro)')
    .eq('ativo', true)
    .gt('expira_em', new Date().toISOString())
    .eq('negocio.ativo', true)
    .eq('negocio.status_cadastro', 'aprovado')
    .order('expira_em', { ascending: true })
    .limit(limite)
  if (error) {
    console.error('Home/ofertas:', error.message)
    return []
  }
  return data as unknown as OfertaHome[]
}

export type NovidadeHome = {
  id: string
  tipo: string
  titulo: string
  conteudo: string | null
  criado_em: string
  negocio: { id: string; nome: string } | null
}

export async function novidadesRecentes(limite = 6): Promise<NovidadeHome[]> {
  const { data, error } = await createPublicClient()
    .from('posts_negocio')
    .select('id, tipo, titulo, conteudo, criado_em, negocio:negocios!inner(id, nome, ativo, status_cadastro)')
    .eq('ativo', true)
    .neq('tipo', 'vaga_propria')
    .eq('negocio.ativo', true)
    .eq('negocio.status_cadastro', 'aprovado')
    .gte('criado_em', new Date(Date.now() - 30 * 86400e3).toISOString())
    .order('criado_em', { ascending: false })
    .limit(limite)
  if (error) {
    console.error('Home/novidades:', error.message)
    return []
  }
  return data as unknown as NovidadeHome[]
}

/**
 * Populares = mais visitantes distintos nos últimos 30 dias (eventos de
 * visualização já deduplicados por visitante — lib/metricas). Critério
 * explicado na própria seção. Mínimo de 3 visitas pra entrar.
 */
export async function negociosPopulares(limite = 8): Promise<(Negocio & { visitas: number })[]> {
  const { data: eventos } = await createServiceClient()
    .from('eventos_perfil')
    .select('negocio_id')
    .eq('tipo', 'visualizacao')
    .gte('criado_em', new Date(Date.now() - 30 * 86400e3).toISOString())
    .limit(20000)

  const contagem = new Map<string, number>()
  for (const e of eventos ?? []) contagem.set(e.negocio_id, (contagem.get(e.negocio_id) ?? 0) + 1)
  const top = Array.from(contagem.entries())
    .filter(([, n]) => n >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite)
  if (top.length === 0) return []

  const { data } = await createPublicClient()
    .from('negocios')
    .select(CAMPOS_NEGOCIO)
    .in('id', top.map(([id]) => id))
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
  const porId = new Map((data ?? []).map((n) => [n.id, n]))
  return top
    .map(([id, visitas]) => (porId.has(id) ? { ...(porId.get(id) as unknown as Negocio), visitas } : null))
    .filter((n): n is Negocio & { visitas: number } => n !== null)
}

/** Autônomos: destaque pago primeiro (com selo "Destaque"), depois perfis com foto, depois mais recentes. */
export async function profissionaisAutonomos(limite = 8): Promise<Negocio[]> {
  const { data, error } = await createPublicClient()
    .from('negocios')
    .select(CAMPOS_NEGOCIO)
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .eq('tipo_perfil', 'autonomo')
    .order('destaque_ativo', { ascending: false })
    .order('foto_capa_url', { ascending: true, nullsFirst: false })
    .order('criado_em', { ascending: false })
    .limit(limite)
  if (error) {
    console.error('Home/autônomos:', error.message)
    return []
  }
  return data as unknown as Negocio[]
}

export type EventoHome = { id: string; titulo: string; local_evento: string | null; data_evento: string; bairro: string | null }

export async function proximosEventos(limite = 5): Promise<EventoHome[]> {
  const { data, error } = await createPublicClient()
    .from('avisos_cidade')
    .select('id, titulo, local_evento, data_evento, bairro')
    .eq('ativo', true)
    .eq('tipo', 'evento')
    .gte('data_evento', new Date(Date.now() - 6 * 3600e3).toISOString())
    .order('data_evento', { ascending: true })
    .limit(limite)
  if (error) {
    console.error('Home/eventos:', error.message)
    return []
  }
  return data as EventoHome[]
}
