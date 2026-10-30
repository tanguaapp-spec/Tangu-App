import type { SupabaseClient } from '@supabase/supabase-js'
import { FUSO, diaISO } from '@/lib/datas'

export type LinhaRanking = {
  perfil_id: string
  nome: string
  bairro: string | null
  laranjas: number
  indicacoes: number
  avaliacoes: number
  favoritos: number
  saldo_total: number
}

/** "2026-10" do mês atual em Tanguá. */
export const mesAtual = (agora = new Date()) => diaISO(agora).slice(0, 7)

/** Início e fim do mês em Tanguá (meia-noite daqui = 3h UTC). */
export function limitesDoMes(mes: string) {
  const [ano, m] = mes.split('-').map(Number)
  return { inicio: new Date(Date.UTC(ano, m - 1, 1, 3)), fim: new Date(Date.UTC(ano, m, 1, 3)) }
}

export function mesValido(mes: string | undefined | null) {
  return !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes)
}

/** Últimos `n` meses, do atual para trás: ["2026-10", "2026-09", …]. */
export function ultimosMeses(n: number, agora = new Date()) {
  const [ano, m] = mesAtual(agora).split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(ano, m - 1 - i, 15))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

/** "outubro de 2026" */
export function nomeDoMes(mes: string) {
  const { inicio } = limitesDoMes(mes)
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, month: 'long', year: 'numeric' }).format(inicio)
}

/**
 * Ranking do mês (função ranking_engajamento, 0029), sem admins nem a
 * equipe da plataforma. Devolve null se a migration ainda não rodou.
 */
export async function rankingDoMes(db: SupabaseClient, mes: string, limite = 100): Promise<LinhaRanking[] | null> {
  const { inicio, fim } = limitesDoMes(mes)
  const [{ data, error }, { data: admins }, { data: equipe }] = await Promise.all([
    db.rpc('ranking_engajamento', { p_inicio: inicio.toISOString(), p_fim: fim.toISOString(), p_limite: limite + 20 }),
    db.from('administradores_plataforma').select('perfil_id'),
    db.from('equipe_plataforma').select('perfil_id'),
  ])
  if (error) return null
  const fora = new Set([...(admins ?? []), ...(equipe ?? [])].map((x) => x.perfil_id as string))
  return ((data ?? []) as LinhaRanking[])
    .filter((l) => !fora.has(l.perfil_id))
    .slice(0, limite)
    .map((l) => ({
      ...l,
      laranjas: Number(l.laranjas),
      indicacoes: Number(l.indicacoes),
      avaliacoes: Number(l.avaliacoes),
      favoritos: Number(l.favoritos),
      saldo_total: Number(l.saldo_total),
    }))
}
