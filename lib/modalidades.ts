import type { ModalidadeAtendimento } from './types/database'

// Dado puro (sem React) pra poder ser usado tanto em componentes de servidor
// quanto de cliente. Ícones ficam mapeados separadamente onde forem usados.
export const MODALIDADES: {
  valor: ModalidadeAtendimento
  rotulo: string
  rotuloCurto: string
  descricao: string
}[] = [
  {
    valor: 'loja_fisica',
    rotulo: 'Loja física',
    rotuloCurto: 'Loja física',
    descricao: 'Tenho um endereço fixo — o cliente vem até lá.',
  },
  {
    valor: 'atende_em_casa',
    rotulo: 'Atende em casa',
    rotuloCurto: 'Atende em casa',
    descricao: 'Atendo na minha casa, combinando antes com o cliente.',
  },
  {
    valor: 'atende_domicilio',
    rotulo: 'Vai até o cliente',
    rotuloCurto: 'A domicílio',
    descricao: 'Eu vou até o endereço do cliente.',
  },
  {
    valor: 'servico_digital',
    rotulo: 'Serviço digital',
    rotuloCurto: 'Digital',
    descricao: 'Atendimento 100% online — não precisa de endereço.',
  },
]

export function rotuloModalidade(valor: ModalidadeAtendimento) {
  return MODALIDADES.find((m) => m.valor === valor)?.rotuloCurto ?? valor
}

// true quando o negócio tem alguma modalidade que se beneficia de um endereço visível.
export function precisaDeEndereco(modalidades: ModalidadeAtendimento[]) {
  return modalidades.includes('loja_fisica') || modalidades.includes('atende_em_casa')
}
