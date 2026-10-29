/**
 * Listas automáticas de quem contatar (painel Leads) e o "parecer" do app
 * para cada contato: por que ligar, quão quente está e a mensagem pronta.
 * Cálculo puro; a busca fica em lib/leads/dados.ts.
 */

export const SEGMENTOS = [
  { chave: 'hoje', titulo: 'Contatar hoje', descricao: 'Retornos que vocês marcaram para hoje ou que já passaram.' },
  { chave: 'quente', titulo: 'Gratuito com movimento', descricao: 'Negócios no plano grátis que já recebem visitas e cliques no WhatsApp. Os mais fáceis de virar pagantes.' },
  { chave: 'teste', titulo: 'Teste grátis acabando', descricao: 'O teste termina nos próximos 7 dias. Hora de mostrar o resultado.' },
  { chave: 'abandono', titulo: 'Abandonou o pagamento', descricao: 'Abriram o pagamento do plano ou da divulgação e não concluíram.' },
  { chave: 'incompleto', titulo: 'Cadastro incompleto', descricao: 'Cadastraram o negócio e pararam no meio (sem foto, WhatsApp ou produto).' },
  { chave: 'nao_reivindicado', titulo: 'Ainda não reivindicados', descricao: 'Perfis criados pela plataforma. O dono ainda não assumiu.' },
  { chave: 'cancelou', titulo: 'Cancelou', descricao: 'Pagavam e deixaram de pagar nos últimos 60 dias.' },
] as const
export type Segmento = (typeof SEGMENTOS)[number]['chave']

export const ETAPAS = [
  ['novo', 'Novo'],
  ['contatado', 'Contatado'],
  ['interessado', 'Interessado'],
  ['negociando', 'Negociando'],
  ['cliente', 'Virou cliente'],
  ['perdido', 'Perdido'],
] as const
export type Etapa = (typeof ETAPAS)[number][0]

export type Temperatura = 'quente' | 'morno' | 'frio'

export type SinaisLead = {
  nome: string
  visitas30d: number
  cliquesWhats30d: number
  favoritos30d: number
  diasParaFimTeste?: number | null
  faltando?: string[]
  plano?: string | null
}

/** 0–100: visitas pesam pouco, clique no WhatsApp pesa muito (é cliente de verdade chegando). */
export function pontuacao(s: Pick<SinaisLead, 'visitas30d' | 'cliquesWhats30d' | 'favoritos30d'>) {
  return Math.min(100, Math.round(s.visitas30d * 1 + s.cliquesWhats30d * 6 + s.favoritos30d * 4))
}

export function temperatura(segmento: Segmento, s: SinaisLead): Temperatura {
  if (segmento === 'abandono' || segmento === 'teste') return 'quente'
  const p = pontuacao(s)
  return p >= 40 ? 'quente' : p >= 12 ? 'morno' : 'frio'
}

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? ''

/** O que o app recomenda dizer, e a mensagem pronta pro WhatsApp. */
export function sugestao(segmento: Segmento, s: SinaisLead, linkApp = 'https://tangua-app.vercel.app'): { parecer: string; mensagem: string } {
  const numeros = `${s.visitas30d} visita${s.visitas30d === 1 ? '' : 's'} e ${s.cliquesWhats30d} clique${s.cliquesWhats30d === 1 ? '' : 's'} no WhatsApp`
  switch (segmento) {
    case 'quente':
      return {
        parecer: `Recebeu ${numeros} no último mês sem pagar nada. Mostre esses números e ofereça o plano Essencial.`,
        mensagem: `Olá! Aqui é do Tanguá App. O perfil da ${s.nome} teve ${numeros} no último mês 👏 Dá pra aparecer ainda mais com o plano Essencial (pedidos e agenda pelo WhatsApp, mais produtos). Posso te mostrar em 2 minutos?`,
      }
    case 'teste':
      return {
        parecer: `O teste acaba em ${s.diasParaFimTeste ?? 'poucos'} dia(s). Resultado até aqui: ${numeros}. Ligue antes do fim.`,
        mensagem: `Olá! Aqui é do Tanguá App. O teste grátis da ${s.nome} termina em ${s.diasParaFimTeste ?? 'poucos'} dia(s). Até agora foram ${numeros}. Quer continuar com os recursos? Te ajudo a assinar pelo Pix em 1 minuto.`,
      }
    case 'abandono':
      return {
        parecer: 'Começou a pagar e desistiu no meio. Normalmente é dúvida sobre Pix, cartão ou o que está incluído.',
        mensagem: `Olá! Aqui é do Tanguá App. Vi que você começou a contratar para a ${s.nome} e não terminou. Ficou alguma dúvida? Posso te ajudar por aqui mesmo.`,
      }
    case 'incompleto':
      return {
        parecer: `Falta ${(s.faltando ?? []).join(', ') || 'completar o perfil'}. Perfil incompleto quase não recebe contato.`,
        mensagem: `Olá, tudo bem? Aqui é do Tanguá App. O perfil da ${s.nome} está quase pronto: falta ${(s.faltando ?? []).join(', ') || 'pouca coisa'}. Quer que eu te ajude a terminar agora? Leva 5 minutos.`,
      }
    case 'nao_reivindicado':
      return {
        parecer:
          s.visitas30d > 0
            ? `Mesmo sem dono, o perfil teve ${numeros}. Ótimo argumento pra ele assumir o perfil grátis.`
            : 'Perfil criado pela plataforma. Convide o dono para assumir de graça e completar com fotos e preços.',
        mensagem: `Olá! Aqui é do Tanguá App, o guia de Tanguá. A ${s.nome} já aparece no app com nome e endereço${s.visitas30d > 0 ? ` e teve ${numeros} este mês` : ''}. É grátis assumir o perfil e colocar fotos, preços e ofertas. Toque em “Sou o dono” aqui: ${linkApp} Se preferir, a gente oculta, é só avisar.`,
      }
    case 'cancelou':
      return {
        parecer: 'Pagava e saiu. Descubra o motivo: preço, falta de resultado ou dificuldade de uso.',
        mensagem: `Olá, ${primeiroNome(s.nome)}! Aqui é do Tanguá App. Vi que a ${s.nome} saiu do plano. Pode me contar o que não funcionou? Sua resposta ajuda a gente a melhorar.`,
      }
    case 'hoje':
    default:
      return {
        parecer: 'Retorno combinado para hoje.',
        mensagem: `Olá! Aqui é do Tanguá App, retomando nossa conversa sobre a ${s.nome}.`,
      }
  }
}

/** Telefone brasileiro → link wa.me com mensagem; null se o número não serve. */
export function linkWhatsapp(telefone: string | null | undefined, mensagem: string) {
  const d = (telefone ?? '').replace(/\D/g, '').replace(/^0+/, '')
  const local = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d
  if (local.length !== 10 && local.length !== 11) return null
  return `https://wa.me/55${local}?text=${encodeURIComponent(mensagem)}`
}
