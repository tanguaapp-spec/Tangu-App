import type { Metadata } from 'next'
import Link from 'next/link'
import { listarPlanos } from '@/lib/queries/planos'
import { TabelaPlanos } from '@/components/planos/tabela-planos'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Planos para negócios',
  description: 'Divulgue seu negócio em Tanguá de graça. Planos pagos com mais espaço no catálogo, mais ofertas e destaque na busca.',
  alternates: { canonical: '/planos' },
}

export default async function PaginaPlanos() {
  const planos = await listarPlanos()

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900 sm:text-4xl">
        Seu negócio na vitrine de Tanguá
      </h1>
      <p className="mt-3 max-w-2xl text-barro-700">
        Comece grátis — perfil completo, catálogo, novidades e contato direto pelo WhatsApp. Se precisar de mais espaço
        ou quiser aparecer no topo, troque de plano quando quiser, sem fidelidade.
      </p>

      <div className="mt-8">
        <TabelaPlanos
          planos={planos}
          acao={(plano) => (
            <Link
              href={plano.preco_centavos === 0 ? '/cadastrar?papel=profissional' : `/painel/negocio/assinatura#plano-${plano.id}`}
              className={
                plano.preco_centavos === 0
                  ? 'block rounded-xl bg-casca-700 px-5 py-2.5 text-center font-semibold text-white hover:bg-casca-800'
                  : 'block rounded-xl border border-barro-300 px-5 py-2.5 text-center font-semibold text-barro-800 hover:bg-barro-100'
              }
            >
              {plano.preco_centavos === 0 ? 'Cadastrar grátis' : `Quero o ${plano.nome}`}
            </Link>
          )}
        />
      </div>

      <section className="mt-12 grid gap-6 sm:grid-cols-2" aria-labelledby="duvidas-planos">
        <h2 id="duvidas-planos" className="sr-only">
          Dúvidas frequentes sobre planos
        </h2>
        {[
          ['Tem fidelidade?', 'Não. Você cancela pelo próprio painel, quando quiser. O plano continua valendo até o fim do mês já pago.'],
          ['Como pago?', 'Pelo Mercado Pago, com cobrança mensal automática. O Tanguá App não vê nem guarda dados do seu cartão.'],
          ['E se eu passar do limite?', 'Nada é apagado. Itens acima do limite ficam guardados e você só não consegue adicionar novos até arquivar algo ou trocar de plano.'],
          ['Pagar garante vendas?', 'Não. O plano dá mais espaço e visibilidade; o resultado depende do seu negócio. As estatísticas mostram o que realmente aconteceu.'],
        ].map(([pergunta, resposta]) => (
          <div key={pergunta} className="rounded-casca border border-barro-100 bg-white p-5">
            <h3 className="font-semibold text-barro-900">{pergunta}</h3>
            <p className="mt-1 text-sm text-barro-600">{resposta}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
