import { createServiceClient } from '@/lib/supabase/server'
import { enviarNotificacaoParaPerfis } from '@/lib/push/enviar-notificacao'

/**
 * Categorias que a pessoa pode desligar em Perfil → Comunicação.
 * Avisos da própria conta (pagamento, suporte, moderação) NÃO têm
 * categoria: são essenciais e sempre chegam.
 */
export const CATEGORIAS_OPCIONAIS = {
  novidades_favoritos: 'Novidades dos negócios que favoritei',
  ofertas_favoritos: 'Ofertas dos negócios que favoritei',
  mural: 'Avisos e eventos do mural da cidade',
} as const
export type CategoriaOpcional = keyof typeof CATEGORIAS_OPCIONAIS

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
    const url = n.url && n.url.startsWith('/') ? n.url : undefined

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

    if (opcoes.push !== false) {
      await enviarNotificacaoParaPerfis(destino, { title: n.titulo, body: n.corpo ?? '', url, tag: n.tipo })
    }
  } catch (err) {
    console.error('Falha ao notificar:', err)
  }
}
