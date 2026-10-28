import { percentualDesconto } from '@/lib/ofertas/desconto'
import type { ModalidadeAtendimento } from '@/lib/types/database'

/**
 * Como um negócio/oferta aparece nos cartões — texto puro, sem React, pra
 * servir em Server e Client Components e ser testado.
 */

export type NegocioResumo = {
  id: string
  slug?: string | null
  nome: string
  bairro?: string | null
  foto_capa_url?: string | null
  destaque_ativo?: boolean
  verificado?: boolean
  tipo_perfil?: 'estabelecimento' | 'autonomo'
  area_atendimento?: string | null
  modalidades_atendimento?: ModalidadeAtendimento[] | null
  nota_google?: number | null
  nota_media?: number | string | null
  total_avaliacoes?: number | null
  horario_funcionamento?: Record<string, string> | null
  aberto_agora?: boolean | null
  categoria?: { nome: string; slug?: string; icone?: string | null } | null
}

/** Endereço público do perfil: o amigável quando existe. */
export function urlNegocio(n: { id: string; slug?: string | null }) {
  return `/negocio/${n.slug || n.id}`
}

/** Nota da comunidade quando há avaliações; senão a do Google. */
export function notaNegocio(n: NegocioResumo): { nota: number; total: number | null; fonte: 'comunidade' | 'google' } | null {
  const media = n.nota_media === null || n.nota_media === undefined ? null : Number(n.nota_media)
  if (media && (n.total_avaliacoes ?? 0) > 0) return { nota: media, total: n.total_avaliacoes ?? null, fonte: 'comunidade' }
  if (n.nota_google) return { nota: Number(n.nota_google), total: null, fonte: 'google' }
  return null
}

export function formatarNota(nota: number) {
  return nota.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** "Beleza · ★ 4,8" — ou, pra autônomo sem nota, "Reparos · Vai até você". */
export function metaNegocio(n: NegocioResumo, { comBairro = false } = {}) {
  const partes: string[] = []
  if (n.categoria?.nome) partes.push(n.categoria.nome)
  if (comBairro && n.bairro) partes.push(n.bairro)
  const nota = notaNegocio(n)
  if (nota) partes.push(`★ ${formatarNota(nota.nota)}`)
  else if (n.modalidades_atendimento?.includes('atende_domicilio')) partes.push('Vai até você')
  else if (!comBairro && n.bairro) partes.push(n.bairro)
  return partes.join(' · ')
}

/** Prazo curto de oferta: "hoje", "amanhã", "3 dias", "5h". */
export function prazoCurto(expiraEm: string, agora = new Date()) {
  const ms = new Date(expiraEm).getTime() - agora.getTime()
  if (ms <= 0) return 'encerrada'
  const horas = ms / 3600e3
  if (horas < 1) return `${Math.max(1, Math.round(ms / 60e3))} min`
  if (horas < 12) return `${Math.round(horas)}h`
  const fim = new Date(expiraEm)
  const doDia = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  if (doDia(fim) === doDia(agora)) return 'hoje'
  if (doDia(fim) === doDia(new Date(agora.getTime() + 86400e3))) return 'amanhã'
  return `${Math.ceil(horas / 24)} dias`
}

export function precoCurto(centavos: number) {
  const reais = centavos / 100
  return Number.isInteger(reais)
    ? `R$ ${reais.toLocaleString('pt-BR')}`
    : reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export type OfertaResumo = {
  id: string
  titulo: string
  desconto_texto: string
  expira_em: string
  inicia_em?: string | null
  preco_original_centavos?: number | null
  preco_promocional_centavos?: number | null
  limite_resgates?: number | null
  resgates_count?: number | null
  negocio: { id: string; slug?: string | null; nome: string; bairro: string | null } | null
}

/** Selo da oferta: "-25%" quando há preço de/por (calculado), senão o texto do dono. */
export function seloOferta(o: OfertaResumo): { texto: string; percentual: boolean } {
  const pct = percentualDesconto(o.preco_original_centavos ?? null, o.preco_promocional_centavos ?? null)
  return pct ? { texto: `-${pct}%`, percentual: true } : { texto: o.desconto_texto, percentual: false }
}

export function restantesOferta(o: OfertaResumo) {
  return o.limite_resgates ? Math.max(0, o.limite_resgates - (o.resgates_count ?? 0)) : null
}
