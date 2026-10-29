/**
 * Categorias que a pessoa pode desligar em Perfil → Comunicação.
 * Avisos da própria conta (pagamento, suporte, moderação) NÃO têm
 * categoria: são essenciais e sempre chegam.
 */
export const CATEGORIAS_OPCIONAIS = {
  novidades_favoritos: 'Novidades dos negócios que favoritei',
  ofertas_favoritos: 'Ofertas dos negócios que favoritei',
  ofertas_interesse: 'Ofertas das categorias que me interessam (ex.: açougues, pizzarias)',
  mural: 'Avisos e eventos do mural da cidade',
  lembretes: 'Lembretes (eventos que salvei, avaliar onde fui)',
  meu_negocio: 'Movimento do meu negócio (avaliações, favoritos, resumo semanal)',
} as const
export type CategoriaOpcional = keyof typeof CATEGORIAS_OPCIONAIS

