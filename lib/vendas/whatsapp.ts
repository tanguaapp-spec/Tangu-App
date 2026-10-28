import { DIAS, lerHorarioDia } from '@/lib/horario/funcionamento'

/**
 * Pedido e agendamento "básicos": o app monta a mensagem completa e abre o
 * WhatsApp do negócio. Nada fica reservado no sistema — o negócio confirma
 * pela conversa. (Controle completo: Beloo e Freguês.)
 */

export type ConfigPedidos = {
  entrega?: boolean
  retirada?: boolean
  taxa_entrega_centavos?: number
  pedido_minimo_centavos?: number
  observacao?: string
}

export type ItemPedido = { nome: string; quantidade: number; precoCentavos: number | null }

export const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function totalPedido(itens: ItemPedido[], entrega: boolean, config: ConfigPedidos) {
  const subtotal = itens.reduce((s, i) => s + (i.precoCentavos ?? 0) * i.quantidade, 0)
  const taxa = entrega ? config.taxa_entrega_centavos ?? 0 : 0
  const semPreco = itens.some((i) => i.precoCentavos === null)
  return { subtotal, taxa, total: subtotal + taxa, semPreco }
}

export function mensagemPedido(dados: {
  negocio: string
  itens: ItemPedido[]
  entrega: boolean
  config: ConfigPedidos
  nome: string
  endereco?: string
  pagamento?: string
  observacao?: string
}) {
  const { subtotal, taxa, total, semPreco } = totalPedido(dados.itens, dados.entrega, dados.config)
  const linhas = [
    `*Pedido pelo Tanguá App* para ${dados.negocio}`,
    '',
    ...dados.itens.map((i) => `• ${i.quantidade}x ${i.nome}${i.precoCentavos !== null ? ` — ${reais(i.precoCentavos * i.quantidade)}` : ''}`),
    '',
    `Subtotal: ${reais(subtotal)}${semPreco ? ' (+ itens a combinar)' : ''}`,
  ]
  if (dados.entrega) linhas.push(`Entrega: ${taxa ? reais(taxa) : 'a combinar'}`)
  linhas.push(`*Total: ${reais(total)}${semPreco ? ' + itens a combinar' : ''}*`, '')
  linhas.push(`Nome: ${dados.nome}`)
  linhas.push(dados.entrega ? `Entregar em: ${dados.endereco || '(informar)'}` : 'Vou retirar no local')
  if (dados.pagamento) linhas.push(`Pagamento: ${dados.pagamento}`)
  if (dados.observacao) linhas.push(`Obs.: ${dados.observacao}`)
  return linhas.join('\n')
}

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

/**
 * Horários de início possíveis num dia (AAAA-MM-DD), pelo horário de
 * funcionamento: o serviço inteiro precisa caber no turno, de 30 em 30 min,
 * com 1 h de antecedência quando for hoje.
 */
export function horariosDoDia(horario: Record<string, string> | null | undefined, data: string, duracaoMin: number, agora = new Date()): string[] {
  if (!horario) return []
  const dia = DIAS[new Date(`${data}T12:00:00Z`).getUTCDay()]
  const turnos = lerHorarioDia(horario[dia]) ?? []
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hoje = fmt.format(agora)
  if (data < hoje) return []
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(agora)
  const agoraMin = Number(partes.find((p) => p.type === 'hour')?.value) * 60 + Number(partes.find((p) => p.type === 'minute')?.value)
  const minimo = data === hoje ? agoraMin + 60 : 0
  const saida: string[] = []
  for (const [ini, fim] of turnos) {
    const limite = Math.min(fim, 1440)
    for (let t = Math.ceil(ini / 30) * 30; t + duracaoMin <= limite; t += 30) if (t >= minimo) saida.push(hhmm(t))
  }
  return saida
}

export function mensagemAgendamento(dados: { negocio: string; servico: string; data: string; hora: string; nome: string; observacao?: string }) {
  const quando = new Date(`${dados.data}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
  return [
    `*Pedido de horário pelo Tanguá App* para ${dados.negocio}`,
    '',
    `Serviço: ${dados.servico}`,
    `Dia: ${quando}`,
    `Horário: ${dados.hora}`,
    `Nome: ${dados.nome}`,
    ...(dados.observacao ? [`Obs.: ${dados.observacao}`] : []),
    '',
    'Pode confirmar se esse horário está livre?',
  ].join('\n')
}
