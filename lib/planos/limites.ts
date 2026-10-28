export const CHAVES_LIMITE = ['max_produtos', 'max_cupons_ativos', 'max_posts_mes', 'max_fotos_galeria'] as const
export type ChaveLimite = (typeof CHAVES_LIMITE)[number]

/**
 * Recursos que cada plano liga ou desliga (Admin → Planos e recursos).
 * Recurso novo = acrescentar aqui; o admin passa a ver o interruptor e o
 * servidor confere com recursoLiberado(). Ausente no plano = desligado.
 */
export const CHAVES_RECURSO = [
  'pedidos_whatsapp',
  'agenda_whatsapp',
  'estatisticas_avancadas',
  'relatorio_mensal',
  'destaque_busca',
  'horarios_especiais',
  'redes_sociais',
  'equipe',
  'fidelidade',
  'selo_profissional',
] as const
export type ChaveRecurso = (typeof CHAVES_RECURSO)[number]

export const ROTULO_LIMITE: Record<ChaveLimite, { curto: string; frase: string }> = {
  max_produtos: { curto: 'Produtos e serviços ativos', frase: 'produtos/serviços ativos no catálogo' },
  max_cupons_ativos: { curto: 'Ofertas ativas ao mesmo tempo', frase: 'ofertas ativas ao mesmo tempo' },
  max_posts_mes: { curto: 'Novidades por mês', frase: 'novidades publicadas neste mês' },
  max_fotos_galeria: { curto: 'Fotos na galeria', frase: 'fotos na galeria' },
}

export const ROTULO_RECURSO: Record<ChaveRecurso, string> = {
  pedidos_whatsapp: 'Pedidos pelo WhatsApp (carrinho no catálogo)',
  agenda_whatsapp: 'Agendamento pelo WhatsApp',
  estatisticas_avancadas: 'Estatísticas completas (30 dias, comparativos)',
  relatorio_mensal: 'Relatório mensal para baixar (planilha)',
  destaque_busca: 'Topo da busca e da página inicial',
  horarios_especiais: 'Feriados e horários especiais',
  redes_sociais: 'Instagram e site no perfil',
  equipe: 'Equipe (gerente e atendente)',
  fidelidade: 'Cartão fidelidade',
  selo_profissional: 'Selo "Parceiro Tanguá" no perfil',
}

/** Explicação curta mostrada ao lojista quando o recurso está bloqueado. */
export const AJUDA_RECURSO: Record<ChaveRecurso, string> = {
  pedidos_whatsapp: 'Cliente monta o pedido pelo seu catálogo e manda pronto no seu WhatsApp.',
  agenda_whatsapp: 'Cliente escolhe serviço, dia e horário livre e manda o pedido de horário no seu WhatsApp.',
  estatisticas_avancadas: 'Veja 30 dias de visitas, cliques no WhatsApp e de onde vêm seus clientes.',
  relatorio_mensal: 'Baixe uma planilha por mês com visitas, contatos e avaliações.',
  destaque_busca: 'Apareça primeiro na busca e na página inicial.',
  horarios_especiais: 'Avise feriados e horários diferentes; o selo "aberto agora" acerta sozinho.',
  redes_sociais: 'Mostre seu Instagram e seu site no perfil.',
  equipe: 'Dê acesso ao painel para quem ajuda você.',
  fidelidade: 'Carimbe o cartão de quem volta e premie clientes fiéis.',
  selo_profissional: 'Selo de parceiro no perfil, que passa mais confiança.',
}

/** Recurso ligado no plano? (plano sem a chave = desligado) */
export function temRecurso(recursos: Partial<Record<ChaveRecurso, boolean>> | null | undefined, chave: ChaveRecurso) {
  return recursos?.[chave] === true
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
