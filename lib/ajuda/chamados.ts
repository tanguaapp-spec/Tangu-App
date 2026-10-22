export const CATEGORIAS_CHAMADO = {
  conta: 'Conta e acesso',
  negocio: 'Meu negócio no app',
  pagamento: 'Planos e pagamentos',
  publicacao: 'Publicação removida ou recusada',
  denuncia: 'Denúncia ou segurança',
  privacidade: 'Privacidade e meus dados',
  outro: 'Outro assunto',
} as const

export type CategoriaChamado = keyof typeof CATEGORIAS_CHAMADO

export const STATUS_CHAMADO: Record<string, { rotulo: string; tom: 'verde' | 'aviso' | 'neutro' | 'laranja' }> = {
  aberto: { rotulo: 'Aguardando suporte', tom: 'aviso' },
  respondido: { rotulo: 'Respondido', tom: 'verde' },
  escalado: { rotulo: 'Em análise', tom: 'laranja' },
  resolvido: { rotulo: 'Resolvido', tom: 'verde' },
  fechado: { rotulo: 'Fechado', tom: 'neutro' },
}

/** ?assunto=... vindo de links contextuais → categoria do formulário */
export function categoriaDoAssunto(assunto: string | undefined): CategoriaChamado {
  switch (assunto) {
    case 'cadastro':
      return 'negocio'
    case 'publicacao':
      return 'publicacao'
    case 'pagamento':
      return 'pagamento'
    case 'privacidade':
      return 'privacidade'
    case 'conta':
      return 'conta'
    default:
      return 'outro'
  }
}
