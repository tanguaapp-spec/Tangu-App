import Link from 'next/link'
import { alternarModulo } from '@/lib/actions/admin-config-actions'
import { InterruptorAcao } from '@/components/painel/admin/interruptor-acao'
import { lerConfig } from '@/lib/config/ler'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Recursos do app', robots: { index: false } }

const MODULOS: { chave: string; nome: string; descricao: string }[] = [
  { chave: 'pedidos_whatsapp', nome: 'Pedidos pelo WhatsApp', descricao: 'Carrinho no catálogo do negócio; o pedido chega pronto no WhatsApp dele. Cada plano decide quem pode usar.' },
  { chave: 'agenda_whatsapp', nome: 'Agendamento pelo WhatsApp', descricao: 'Cliente escolhe serviço, dia e horário livre e manda o pedido de horário no WhatsApp.' },
  { chave: 'noticias', nome: 'Notícias da cidade', descricao: 'Página de notícias, leitura do RSS da Prefeitura e "Sugerir notícia".' },
  { chave: 'servicos_uteis', nome: 'Serviços úteis', descricao: 'Telefones de emergência, farmácia de plantão, coleta e transporte.' },
  { chave: 'mapa', nome: 'Mapa', descricao: 'Mapa dos comércios com "perto de mim".' },
  { chave: 'mural', nome: 'Mural da cidade', descricao: 'Recados, perguntas e avisos entre vizinhos.' },
  { chave: 'vagas', nome: 'Vagas de emprego', descricao: 'Lista pública de vagas e cadastro pelos negócios.' },
  { chave: 'orcamentos', nome: 'Pedido de orçamento', descricao: 'Morador pede orçamento e vários profissionais respondem.' },
  { chave: 'nps', nome: 'Pesquisa de satisfação (NPS)', descricao: 'Pergunta de 0 a 10 depois de alguns dias de uso, no máximo a cada 90 dias.' },
]

export default async function PaginaRecursos() {
  const modulos = await lerConfig('modulos_ativos')
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Recursos do app</h1>
        <p className="mt-1 text-barro-600">
          Liga e desliga partes inteiras do app, para todo mundo. Desligar esconde o recurso na hora; nada é apagado. Para escolher
          quais planos têm cada ferramenta, use{' '}
          <Link href="/painel/admin/planos" className="font-semibold text-mata-700 underline">
            Planos e recursos
          </Link>
          ; para preços de banner e destaque, use{' '}
          <Link href="/painel/admin/divulgacao" className="font-semibold text-mata-700 underline">
            Divulgação paga
          </Link>
          .
        </p>
      </header>
      <ul className="flex flex-col divide-y divide-barro-100 rounded-casca border border-barro-100 bg-superficie">
        {MODULOS.map((m) => (
          <li key={m.chave} className="flex items-center gap-4 p-4">
            <div className="min-w-0 flex-1">
              <b className="block text-barro-900">{m.nome}</b>
              <span className="text-sm text-barro-600">{m.descricao}</span>
            </div>
            <InterruptorAcao ligado={modulos[m.chave] !== false} acao={alternarModulo} campos={{ modulo: m.chave }} rotulo={m.nome} />
          </li>
        ))}
      </ul>
    </div>
  )
}
