import Link from 'next/link'
import { ArrowUpRight, CalendarCheck, ShoppingBag, Sparkles } from 'lucide-react'
import { Botao } from '@/components/ui/botao'

export const metadata = {
  title: 'Ferramentas pro seu negócio',
  description: 'Ferramentas feitas pelo mesmo time do Tanguá App pra organizar agenda e vender pelo WhatsApp.',
}

const ferramentas = [
  {
    nome: 'Beloo',
    slug: 'beloo',
    icone: CalendarCheck,
    cor: 'casca' as const,
    titulo: 'Agenda online pra quem vive de horário marcado',
    descricao:
      'Chega de agenda perdida no WhatsApp ou em caderno. Cliente marca sozinho, você recebe organizado e nunca mais dá horário duplicado.',
    paraQuem: 'Manicure, cabeleireiro(a), barbeiro, esteticista, maquiador(a)',
    recursos: [
      'Agenda inteligente que calcula os horários livres pela duração de cada serviço',
      'Loja de produtos pra vender junto com o atendimento',
      'Pagamento online e pacotes de fidelidade com crédito automático',
      'Lembrete de aniversário e lista de espera',
      'QR code personalizado pra colar no salão',
    ],
    cta: 'Criar minha agenda grátis',
    url: 'https://beloo-xzdr.vercel.app',
  },
  {
    nome: 'CatalogAI',
    slug: 'catalogai',
    icone: ShoppingBag,
    cor: 'mata' as const,
    titulo: 'Cardápio digital com pedido direto no seu WhatsApp',
    descricao:
      'Monte seu catálogo com fotos e preço, cliente escolhe e o pedido cai certinho no seu WhatsApp — sem precisar instalar nada.',
    paraQuem: 'Restaurante, pizzaria, lanchonete, loja de roupa, mercado',
    recursos: [
      'Catálogo com fotos, descrição, preço e variações do produto',
      'Pedido automático pro WhatsApp, com link de acompanhamento',
      'Controle de estoque em tempo real e opção de entrega ou retirada',
      'Relatório financeiro diário, semanal e mensal',
      'Cores da sua marca — instala como app no celular do cliente',
    ],
    cta: 'Testar 7 dias grátis',
    url: 'https://card-pio-digital-hazel.vercel.app',
  },
]

const coresFerramenta = {
  casca: { bg: 'bg-casca-100', texto: 'text-casca-600', selo: 'bg-casca-50 text-casca-700' },
  mata: { bg: 'bg-mata-100', texto: 'text-mata-600', selo: 'bg-mata-50 text-mata-700' },
}

export default function PaginaFerramentas() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-casca-100 px-3 py-1 text-sm font-semibold text-casca-700">
        <Sparkles className="h-3.5 w-3.5" /> Feito pelo mesmo time do Tanguá App
      </span>
      <h1 className="mt-4 text-balance font-display text-3xl font-semibold tracking-tight text-barro-900 sm:text-4xl">
        Ferramentas pra tocar seu negócio além do diretório
      </h1>
      <p className="mt-3 max-w-2xl text-barro-600">
        O Tanguá App te coloca no mapa da cidade. Essas duas ferramentas cuidam do que vem
        depois: organizar sua agenda e vender direto pelo WhatsApp, sem depender de planilha
        ou grupo bagunçado.
      </p>

      <div className="mt-10 space-y-6">
        {ferramentas.map((f) => {
          const cores = coresFerramenta[f.cor]
          return (
            <div key={f.slug} className="rounded-casca border border-barro-100 bg-white p-6 shadow-feira sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cores.bg} ${cores.texto}`}>
                    <f.icone className="h-6 w-6" />
                  </div>
                  <div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cores.selo}`}>
                      {f.nome}
                    </span>
                    <h2 className="mt-1 font-display text-xl font-semibold text-barro-900">{f.titulo}</h2>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-barro-700">{f.descricao}</p>
              <p className="mt-2 text-sm text-barro-500">
                <span className="font-medium text-barro-700">Pra quem é:</span> {f.paraQuem}
              </p>

              <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                {f.recursos.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-barro-600">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cores.bg}`} />
                    {r}
                  </li>
                ))}
              </ul>

              <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block">
                <Botao className="w-full sm:w-auto">
                  {f.cta} <ArrowUpRight className="h-4 w-4" />
                </Botao>
              </a>
            </div>
          )
        })}
      </div>

      <p className="mt-10 text-center text-sm text-barro-400">
        Já tem seu negócio no Tanguá App?{' '}
        <Link href="/painel/negocio" className="font-medium text-casca-600 hover:underline">
          Veja seu painel
        </Link>
      </p>
    </div>
  )
}
