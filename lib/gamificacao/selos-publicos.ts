import type { SupabaseClient } from '@supabase/supabase-js'
import { seloPrincipal, type DefinicaoSelo } from './selos'

/** Selo de cada autor de avaliação (contagens pela função contagens_selos, 0029). */
export async function selosDosAutores(db: SupabaseClient, autores: string[]): Promise<Map<string, DefinicaoSelo>> {
  const ids = Array.from(new Set(autores.filter(Boolean))).slice(0, 100)
  const mapa = new Map<string, DefinicaoSelo>()
  if (!ids.length) return mapa
  const { data, error } = await db.rpc('contagens_selos', { p_autores: ids })
  // antes da 0029: sem selo, a página segue normal
  if (error || !data) return mapa
  for (const l of data as { perfil_id: string; avaliacoes: number; favoritos: number }[]) {
    const selo = seloPrincipal(Number(l.avaliacoes), Number(l.favoritos))
    if (selo) mapa.set(l.perfil_id, selo)
  }
  return mapa
}
