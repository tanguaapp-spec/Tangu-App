/**
 * Mensagens de prospecção (contato com quem ainda não está no app), nas
 * três versões combinadas com o time: principal, curta e para autônomo.
 */

export type VersaoMensagem = 'principal' | 'curta' | 'autonomo'

export const VERSOES: { valor: VersaoMensagem; rotulo: string }[] = [
  { valor: 'principal', rotulo: 'Principal (loja física)' },
  { valor: 'curta', rotulo: 'Curta (teste)' },
  { valor: 'autonomo', rotulo: 'Autônomo' },
]

/** Categorias de quem trabalha por conta (eletricista, manicure, pedreiro…). */
const AUTONOMOS = /eletricist|encanador|pedreir|pintor|manicure|chaveiro|jardin|fotograf|costura|domestic|frete|mudanca|tecnico|dedetiz|professor|personal|diarista|baba|cuidador/

export function versaoSugerida(categoria: string | null | undefined): VersaoMensagem {
  return AUTONOMOS.test((categoria ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()) ? 'autonomo' : 'principal'
}

export function mensagemProspeccao(versao: VersaoMensagem, d: { loja: string; remetente: string; busca?: string | null }) {
  const busca = (d.busca ?? '').trim().toLowerCase() || 'o que vocês vendem'
  const quem = d.remetente.trim() || 'a equipe'
  switch (versao) {
    case 'curta':
      return [
        `Oi! Vi a ${d.loja} no Google Maps.`,
        'Estou montando o APP TANGUÁ, onde o pessoal de Tanguá acha loja e profissional e chama direto no WhatsApp.',
        'Posso criar o perfil de vocês de graça, com fotos, horário e catálogo, e te mando para aprovar antes de publicar. Topa?',
      ].join('\n')
    case 'autonomo':
      return [
        `Oi, ${d.loja}! Vi seu trabalho no Google Maps 👋`,
        'No APP TANGUÁ, quem mora em Tanguá pede orçamento uma vez e os profissionais respondem pelo app. Seu endereço de casa nunca aparece, só a região onde você atende.',
        'O perfil é grátis. Posso criar o seu e te mandar para aprovar?',
      ].join('\n')
    case 'principal':
    default:
      return [
        `Oi, tudo bem? Vi a ${d.loja} no Google Maps 👋`,
        `Sou ${quem === 'a equipe' ? 'da equipe' : `o ${quem}`}, do APP TANGUÁ, o app onde o morador de Tanguá procura quem vende e quem faz serviço na cidade.`,
        'Para quem mora aqui: acha a loja, vê se está aberta, pega cupom de desconto e chama direto no WhatsApp, sem ficar perguntando em grupo.',
        `Para vocês: a loja aparece quando alguém busca “${busca}”, com o catálogo, os preços e o botão do WhatsApp. O cliente chega já sabendo o que quer. E dá para publicar ofertas com cupom para movimentar os dias fracos.`,
        'O perfil é grátis e fica pronto em 5 minutos. Se quiser, eu mesmo monto com as informações do Google e te mando para aprovar.',
        'Posso montar? 🙂',
      ].join('\n')
  }
}
