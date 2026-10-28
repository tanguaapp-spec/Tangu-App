import { createServiceClient } from '@/lib/supabase/server'
import { lerConfig } from '@/lib/config/ler'
import { enviarNotificacaoParaPerfis } from '@/lib/push/enviar-notificacao'

import { CATEGORIAS_OPCIONAIS, type CategoriaOpcional } from '@/lib/notificacoes/categorias'

export { CATEGORIAS_OPCIONAIS, type CategoriaOpcional }

export type Notificacao = {
  tipo: string
  titulo: string
  corpo?: string
  /** só caminho interno */
  url?: string
}

/** Remove quem desligou a categoria. Sem categoria = essencial, ninguém é removido. */
async function filtrarPorPreferencia(perfilIds: string[], categoria?: CategoriaOpcional) {
  const unicos = Array.from(new Set(perfilIds))
  if (!categoria || unicos.length === 0) return unicos
  const { data } = await createServiceClient().from('perfis').select('id, preferencias_notificacao').in('id', unicos)
  return (data ?? []).filter((p) => p.preferencias_notificacao?.[categoria] !== false).map((p) => p.id as string)
}

/** Quem já recebeu o máximo de avisos opcionais hoje (só vai pro sino, sem tocar o celular). */
async function atingiramLimiteDiario(perfilIds: string[]) {
  const limite = Number(await lerConfig('max_push_opcional_dia'))
  if (!Number.isFinite(limite) || limite <= 0 || perfilIds.length === 0) return new Set<string>(limite === 0 ? perfilIds : [])
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const { data, error } = await createServiceClient()
    .from('notificacoes')
    .select('perfil_id')
    .eq('opcional', true)
    .gte('criado_em', new Date(`${hoje}T00:00:00-03:00`).toISOString())
    .in('perfil_id', perfilIds.slice(0, 1000))
    .limit(20000)
  if (error) return new Set<string>()
  const contagem = new Map<string, number>()
  for (const l of data ?? []) contagem.set(l.perfil_id, (contagem.get(l.perfil_id) ?? 0) + 1)
  return new Set(Array.from(contagem.entries()).filter(([, n]) => n >= limite).map(([id]) => id))
}

/** 22h às 8h em Tanguá: push opcional espera (fica só no sino do app). */
export function horarioSilencioso(agora = new Date()) {
  const hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(agora))
  return hora >= 22 || hora < 8
}

/** Marca links de perfil vindos de notificação (o painel do lojista mostra a origem das visitas). */
export function comOrigemPush(url: string | undefined) {
  if (!url || !url.startsWith('/negocio/')) return url
  const [caminho, hash] = url.split('#')
  const sep = caminho.includes('?') ? '&' : '?'
  return `${caminho}${caminho.includes('origem=') ? '' : `${sep}origem=push`}${hash ? `#${hash}` : ''}`
}

/**
 * Grava no sino do app e manda push. Falha em silêncio (nunca derruba a
 * ação principal) — mas registra no console pra aparecer nos logs.
 */
export async function notificar(
  perfilIds: string[],
  n: Notificacao,
  opcoes: { categoria?: CategoriaOpcional; noApp?: boolean; push?: boolean } = {}
) {
  try {
    const destino = await filtrarPorPreferencia(perfilIds, opcoes.categoria)
    if (destino.length === 0) return
    const url = n.url && n.url.startsWith('/') && !n.url.startsWith('//') ? n.url : undefined

    // limite diário de push opcional por pessoa (Admin → Configurações); conta antes de gravar esta
    const passaramDoLimite = opcoes.categoria ? await atingiramLimiteDiario(destino) : new Set<string>()

    if (opcoes.noApp !== false) {
      const linhas = destino.map((perfil_id) => ({
        perfil_id,
        tipo: n.tipo,
        titulo: n.titulo.slice(0, 140),
        corpo: n.corpo?.slice(0, 500) ?? null,
        url: url ?? null,
        opcional: !!opcoes.categoria,
      }))
      for (let i = 0; i < linhas.length; i += 500) {
        const lote = linhas.slice(i, i + 500)
        let { error } = await createServiceClient().from('notificacoes').insert(lote)
        // banco sem a migration 0023 ainda: grava sem a coluna nova
        if (error && /opcional/.test(error.message)) ({ error } = await createServiceClient().from('notificacoes').insert(lote.map(({ opcional: _o, ...resto }) => resto)))
        if (error) console.error('Falha ao gravar notificações no app:', error.message)
      }
    }

    // opcional de madrugada não acorda ninguém: fica só no sino
    const podePush = opcoes.push !== false && !(opcoes.categoria && horarioSilencioso())
    if (podePush) {
      const destinoPush = destino.filter((id) => !passaramDoLimite.has(id))
      if (destinoPush.length) await enviarNotificacaoParaPerfis(destinoPush, { title: n.titulo, body: n.corpo ?? '', url: comOrigemPush(url), tag: n.tipo })
    }
  } catch (err) {
    console.error('Falha ao notificar:', err)
  }
}
