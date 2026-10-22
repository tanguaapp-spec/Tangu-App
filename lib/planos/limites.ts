export const CHAVES_LIMITE = ['max_produtos', 'max_cupons_ativos', 'max_posts_mes', 'max_fotos_galeria'] as const
export type ChaveLimite = (typeof CHAVES_LIMITE)[number]

export const CHAVES_RECURSO = ['estatisticas_avancadas', 'destaque_busca'] as const
export type ChaveRecurso = (typeof CHAVES_RECURSO)[number]

export const ROTULO_LIMITE: Record<ChaveLimite, { curto: string; frase: string }> = {
  max_produtos: { curto: 'Produtos e serviços ativos', frase: 'produtos/serviços ativos no catálogo' },
  max_cupons_ativos: { curto: 'Ofertas ativas ao mesmo tempo', frase: 'ofertas ativas ao mesmo tempo' },
  max_posts_mes: { curto: 'Novidades por mês', frase: 'novidades publicadas neste mês' },
  max_fotos_galeria: { curto: 'Fotos na galeria', frase: 'fotos na galeria' },
}

export const ROTULO_RECURSO: Record<ChaveRecurso, string> = {
  estatisticas_avancadas: 'Estatísticas completas (30 dias, comparativos)',
  destaque_busca: 'Topo da busca e da página inicial',
}

export type UsoPlano = {
  plano: string
  recursos: Partial<Record<ChaveRecurso, boolean>> | null
  limites: Record<ChaveLimite, { limite: number | null; uso: number }>
}

export function formatarLimite(limite: number | null) {
  return limite === null ? 'Ilimitado' : String(limite)
}

/** 'perto' a partir de 80% do limite — usado pro aviso contextual no painel. */
export function situacaoLimite(uso: number, limite: number | null): 'livre' | 'perto' | 'cheio' {
  if (limite === null) return 'livre'
  if (uso >= limite) return 'cheio'
  return uso >= Math.ceil(limite * 0.8) ? 'perto' : 'livre'
}

type ErroBanco = { message?: string; code?: string } | null | undefined

/**
 * Converte erro do Postgres/PostgREST em mensagem pro usuário, sem expor
 * detalhes internos. Erros não previstos voltam genéricos — quem chama
 * deve logar o original.
 */
export function traduzirErroBanco(erro: ErroBanco, fallback = 'Não foi possível salvar agora. Tente de novo em instantes.'): string {
  if (!erro) return fallback
  const msg = erro.message ?? ''
  const limite = msg.match(/LIMITE_PLANO:([a-z_]+)/)
  if (limite) {
    const chave = limite[1] as ChaveLimite
    const rotulo = ROTULO_LIMITE[chave]?.frase ?? 'itens'
    return `Você chegou ao limite de ${rotulo} do seu plano. Arquive algo que não usa mais ou veja os planos em Painel → Plano e assinatura.`
  }
  if (msg.includes('NEGOCIO_DUPLICADO')) return 'Esta conta já tem um negócio cadastrado.'
  if (erro.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return 'Você não tem permissão pra fazer isso.'
  }
  if (erro.code === '23505') return 'Isso já foi cadastrado.'
  if (erro.code === '23514') return 'Algum campo está com formato inválido. Confira os dados e tente de novo.'
  return fallback
}
