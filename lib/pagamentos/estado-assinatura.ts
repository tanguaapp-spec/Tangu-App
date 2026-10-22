/**
 * Regras de transição da assinatura — funções puras, sem I/O.
 *
 * Princípio: o plano pago só passa a valer quando existe COBRANÇA APROVADA
 * confirmada pelo Mercado Pago (consultado pelo servidor). Voltar do
 * checkout, ou o pagador apenas autorizar o débito, não basta.
 *
 *   pendente ──(cobrança aprovada)──────────────▶ ativa
 *   ativa ──(cobrança recusada/em nova tentativa)▶ em_atraso (tolerância N dias)
 *   em_atraso ──(cobrança aprovada)─────────────▶ ativa
 *   ativa/em_atraso ──(estorno/chargeback)──────▶ em_atraso, sem tolerância
 *   qualquer aberta ──(cancelada no MP)─────────▶ cancelada (vale até o fim do período pago)
 *   pendente ──(cancelada/abandonada)───────────▶ expirada
 *   cancelada/em_atraso vencidas ──(cron)───────▶ expirada
 */

export type StatusAssinatura = 'pendente' | 'ativa' | 'em_atraso' | 'cancelada' | 'expirada'
export type StatusPagamento = 'pendente' | 'em_processo' | 'aprovado' | 'recusado' | 'estornado' | 'cancelado'

export type AssinaturaLocal = {
  status: StatusAssinatura
  periodo_atual_inicio: string | null
  periodo_atual_fim: string | null
  tolerancia_ate: string | null
  ultimo_evento_em: string | null
}

export type PatchAssinatura = Partial<AssinaturaLocal> & { cancelada_em?: string | null }

const DIA = 24 * 60 * 60 * 1000

export function mapearStatusPagamentoMP(status: string): StatusPagamento {
  switch (status) {
    case 'approved':
    case 'authorized':
      return 'aprovado'
    case 'in_process':
    case 'in_mediation':
      return 'em_processo'
    case 'rejected':
      return 'recusado'
    case 'refunded':
    case 'charged_back':
      return 'estornado'
    case 'cancelled':
      return 'cancelado'
    default:
      return 'pendente'
  }
}

function umMesDepois(iso: string) {
  const d = new Date(iso)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

/** Evento mais velho que o último aplicado não muda nada (notificação fora de ordem). */
export function eventoDesatualizado(atual: AssinaturaLocal, dataEvento: string | null | undefined) {
  if (!dataEvento || !atual.ultimo_evento_em) return false
  return new Date(dataEvento).getTime() < new Date(atual.ultimo_evento_em).getTime()
}

export function aplicarPagamento(
  atual: AssinaturaLocal,
  pagamento: { status: StatusPagamento; pagoEm: string | null; atualizadoEm: string | null },
  ctx: { agora: Date; toleranciaDias: number; proximaCobranca: string | null }
): PatchAssinatura | null {
  if (atual.status === 'expirada') return null
  if (eventoDesatualizado(atual, pagamento.atualizadoEm)) return null
  const marca = { ultimo_evento_em: pagamento.atualizadoEm ?? ctx.agora.toISOString() }

  if (pagamento.status === 'aprovado') {
    if (atual.status === 'cancelada') return marca // pagamento tardio não reabre o que foi cancelado
    const inicio = pagamento.pagoEm ?? ctx.agora.toISOString()
    const fimCandidato = ctx.proximaCobranca && new Date(ctx.proximaCobranca) > new Date(inicio) ? ctx.proximaCobranca : umMesDepois(inicio)
    return {
      ...marca,
      status: 'ativa',
      periodo_atual_inicio: inicio,
      periodo_atual_fim: fimCandidato,
      tolerancia_ate: null,
    }
  }

  if (pagamento.status === 'recusado') {
    if (atual.status !== 'ativa' && atual.status !== 'em_atraso') return marca
    return {
      ...marca,
      status: 'em_atraso',
      // não renova a tolerância a cada nova tentativa recusada
      tolerancia_ate: atual.tolerancia_ate ?? new Date(ctx.agora.getTime() + ctx.toleranciaDias * DIA).toISOString(),
    }
  }

  if (pagamento.status === 'estornado') {
    if (atual.status !== 'ativa' && atual.status !== 'em_atraso') return marca
    return { ...marca, status: 'em_atraso', tolerancia_ate: ctx.agora.toISOString() }
  }

  return marca
}

export function aplicarPreapproval(
  atual: AssinaturaLocal,
  preapproval: { status: string; ultimaModificacao: string | null; proximaCobranca: string | null },
  ctx: { agora: Date }
): PatchAssinatura | null {
  if (atual.status === 'expirada') return null
  if (eventoDesatualizado(atual, preapproval.ultimaModificacao)) return null
  const marca = { ultimo_evento_em: preapproval.ultimaModificacao ?? ctx.agora.toISOString() }

  switch (preapproval.status) {
    case 'cancelled':
      if (atual.status === 'pendente') return { ...marca, status: 'expirada', cancelada_em: ctx.agora.toISOString() }
      if (atual.status === 'cancelada') return marca
      return { ...marca, status: 'cancelada', cancelada_em: ctx.agora.toISOString() }
    case 'paused':
      if (atual.status === 'ativa') {
        // cobrança pausada: vale até o fim do que já foi pago, sem tolerância extra
        return { ...marca, status: 'em_atraso', tolerancia_ate: atual.periodo_atual_fim ?? ctx.agora.toISOString() }
      }
      return marca
    case 'authorized':
      // débito autorizado ≠ pago: só ajusta a data da próxima cobrança se já estiver ativa
      if (atual.status === 'ativa' && preapproval.proximaCobranca) {
        return { ...marca, periodo_atual_fim: preapproval.proximaCobranca }
      }
      return marca
    default:
      return marca
  }
}

/** Varredura do cron: estados vencidos viram 'expirada'. */
export function expirarSeVencida(atual: AssinaturaLocal, agora: Date): PatchAssinatura | null {
  const t = agora.getTime()
  if (atual.status === 'em_atraso' && atual.tolerancia_ate && new Date(atual.tolerancia_ate).getTime() <= t) {
    return { status: 'expirada' }
  }
  if (atual.status === 'cancelada' && (!atual.periodo_atual_fim || new Date(atual.periodo_atual_fim).getTime() <= t)) {
    return { status: 'expirada' }
  }
  return null
}

/** Checkout abandonado: pendente há mais de N dias sem cobrança aprovada. */
export function pendenteAbandonada(criadoEm: string, agora: Date, dias = 7) {
  return agora.getTime() - new Date(criadoEm).getTime() > dias * DIA
}
