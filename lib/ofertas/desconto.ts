/**
 * Percentual mostrado SÓ quando há preço de/por — calculado, nunca digitado.
 * Arredonda pra baixo: nunca anuncia desconto maior que o real.
 */
export function percentualDesconto(originalCentavos: number | null, promocionalCentavos: number | null): number | null {
  if (!originalCentavos || promocionalCentavos === null || promocionalCentavos === undefined) return null
  if (originalCentavos <= 0 || promocionalCentavos < 0 || promocionalCentavos >= originalCentavos) return null
  return Math.floor(((originalCentavos - promocionalCentavos) / originalCentavos) * 100)
}

export type SituacaoOferta = 'agendada' | 'ativa' | 'esgotada' | 'expirada' | 'suspensa'

export function situacaoOferta(
  c: { ativo: boolean; inicia_em?: string | null; expira_em: string; limite_resgates?: number | null; resgates_count?: number | null },
  agora = new Date()
): SituacaoOferta {
  if (!c.ativo) return 'suspensa'
  if (new Date(c.expira_em) <= agora) return 'expirada'
  if (c.inicia_em && new Date(c.inicia_em) > agora) return 'agendada'
  if (c.limite_resgates && (c.resgates_count ?? 0) >= c.limite_resgates) return 'esgotada'
  return 'ativa'
}

/** Mensagens do erro "CUPOM:*" lançado por resgatar_cupom() no banco. */
export function mensagemErroCupom(mensagem: string | undefined): string {
  const codigo = mensagem?.match(/CUPOM:([a-z]+)/)?.[1]
  switch (codigo) {
    case 'login':
      return 'Entre na sua conta pra pegar o cupom.'
    case 'esgotado':
      return 'Esse cupom esgotou.'
    case 'expirado':
      return 'Essa oferta já terminou.'
    case 'agendado':
      return 'Essa oferta ainda não começou.'
    case 'proprio':
      return 'Você não pode pegar cupom do seu próprio negócio.'
    case 'inexistente':
    case 'indisponivel':
      return 'Essa oferta não está mais disponível.'
    default:
      return 'Não foi possível pegar o cupom agora. Tente de novo.'
  }
}
