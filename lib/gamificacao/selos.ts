// Selos de contribuição do morador — calculados na hora a partir de dados que já
// existem (avaliações, favoritos), sem tabela nova. Pensados como reconhecimento,
// não como métrica de vaidade solta: cada um reflete uma ação real que ajuda a
// cidade (avaliar = mais confiança pros outros, favoritar = sinal de demanda).

export interface DefinicaoSelo {
  chave: string
  rotulo: string
  descricao: string
}

export function calcularSelos(totalAvaliacoes: number, totalFavoritos: number): DefinicaoSelo[] {
  const selos: DefinicaoSelo[] = []

  if (totalAvaliacoes >= 1) {
    selos.push({ chave: 'primeira-avaliacao', rotulo: 'Primeira Avaliação', descricao: 'Deixou a primeira avaliação de um negócio da cidade.' })
  }
  if (totalAvaliacoes >= 3) {
    selos.push({ chave: 'vizinho-ativo', rotulo: 'Vizinho Ativo', descricao: 'Já avaliou 3 ou mais negócios — ajuda outros moradores a decidir.' })
  }
  if (totalAvaliacoes >= 10) {
    selos.push({ chave: 'vizinho-nota-10', rotulo: 'Vizinho Nota 10', descricao: 'Mais de 10 avaliações — referência de confiança no Tanguá App.' })
  }
  if (totalFavoritos >= 5) {
    selos.push({ chave: 'explorador-tangua', rotulo: 'Explorador de Tanguá', descricao: 'Favoritou 5 ou mais negócios da cidade.' })
  }

  return selos
}
