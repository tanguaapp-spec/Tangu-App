/**
 * Datas sempre no horário de Tanguá. O servidor (Vercel) roda em UTC: sem
 * informar o fuso, "16:27" vira "19:27" na tela. Use estas funções em vez
 * de toLocaleString/toLocaleDateString direto (um teste confere isso).
 */

export const FUSO = 'America/Sao_Paulo'

type Entrada = string | number | Date | null | undefined

const comoData = (d: Exclude<Entrada, null | undefined>) => (d instanceof Date ? d : new Date(d))

/** 29/10/2026 16:27 */
export function dataHora(d: Entrada, vazio = '—') {
  if (d == null || d === '') return vazio
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' }).format(comoData(d))
}

/** 29/10/2026 */
export function dataCurta(d: Entrada, vazio = '—') {
  if (d == null || d === '') return vazio
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short' }).format(comoData(d))
}

/** 16:27 */
export function hora(d: Entrada, vazio = '—') {
  if (d == null || d === '') return vazio
  return new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, timeStyle: 'short' }).format(comoData(d))
}

/** "2026-10-29" no dia de Tanguá (às 22h daqui ainda é o mesmo dia, mesmo já sendo 1h em UTC). */
export function diaISO(d: Date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(d)
}

/** Meia-noite do dia 1º do mês corrente em Tanguá, como instante (para filtrar no banco). */
export function inicioDoMes(agora: Date = new Date()) {
  const [ano, mes] = diaISO(agora).split('-').map(Number)
  // Brasil sem horário de verão desde 2019: sempre UTC-3
  return new Date(Date.UTC(ano, mes - 1, 1, 3))
}

/** "29 de outubro, 16:27" (ou só "29 de outubro") */
export function dataPorExtenso(d: Entrada, comHora = true, vazio = '—') {
  if (d == null || d === '') return vazio
  const data = comoData(d)
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: 'long' }).format(data)
  return comHora ? `${dia}, ${hora(data)}` : dia
}
