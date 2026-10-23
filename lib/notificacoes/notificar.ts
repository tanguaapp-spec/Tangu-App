import { createServiceClient } from '@/lib/supabase/server'
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
export async function filtrarPorPreferencia(perfilIds: string[], categoria?: CategoriaOpcional) {
  const unicos = Array.from(new Set(perfilIds))
  if (!categoria || unicos.length === 0) return unicos
  const { data } = await createServiceClient().from('perfis').select('id, preferencias_notificacao').in('id', unicos)
  return (data ?? []).filter((p) => p.preferencias_notificacao?.[categoria] !== false).map((p) => p.id as string)
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

    if (opcoes.noApp !== false) {
      const linhas = destino.map((perfil_id) => ({
        perfil_id,
        tipo: n.tipo,
        titulo: n.titulo.slice(0, 140),
        corpo: n.corpo?.slice(0, 500) ?? null,
        url: url ?? null,
      }))
      for (let i = 0; i < linhas.length; i += 500) {
        const { error } = await createServiceClient().from('notificacoes').insert(linhas.slice(i, i + 500))
        if (error) console.error('Falha ao gravar notificações no app:', error.message)
      }
    }

    // opcional de madrugada não acorda ninguém: fica só no sino
    const podePush = opcoes.push !== false && !(opcoes.categoria && horarioSilencioso())
    if (podePush) {
      await enviarNotificacaoParaPerfis(destino, { title: n.titulo, body: n.corpo ?? '', url: comOrigemPush(url), tag: n.tipo })
    }
  } catch (err) {
    console.error('Falha ao notificar:', err)
  }
}
