import type { Metadata } from 'next'
import Link from 'next/link'
import { LifeBuoy, MessageSquare, Search } from 'lucide-react'
import { ARTIGOS, CATEGORIAS_AJUDA, buscarArtigos, type CategoriaAjuda } from '@/lib/ajuda/artigos'

export const metadata: Metadata = {
  title: 'Central de ajuda',
  description: 'Como cadastrar seu negócio, publicar ofertas, contratar planos, recuperar o acesso e cuidar dos seus dados no Tanguá App.',
  alternates: { canonical: '/ajuda' },
}

export default function PaginaAjuda({ searchParams }: { searchParams: { q?: string } }) {
  const termo = (searchParams.q ?? '').slice(0, 100)
  const resultados = termo ? buscarArtigos(termo) : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        <LifeBuoy className="h-8 w-8 text-casca-600" aria-hidden="true" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Central de ajuda</h1>
      </div>

      <form role="search" action="/ajuda" className="mt-6 flex gap-2">
        <label htmlFor="q" className="sr-only">
          O que você precisa?
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-barro-400" aria-hidden="true" />
          <input
            id="q"
            name="q"
            defaultValue={termo}
            placeholder="Ex.: esqueci a senha, cancelar plano, WhatsApp"
            className="w-full rounded-xl border border-barro-300 bg-superficie py-2.5 pl-9 pr-3 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
          />
        </div>
        <button className="rounded-xl bg-laranja px-4 font-semibold text-tinta hover:bg-laranja-claro">Buscar</button>
      </form>

      {termo && (
        <section className="mt-6" aria-live="polite">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-barro-500">
            {resultados.length ? `Resultados para "${termo}"` : `Nada encontrado para "${termo}"`}
          </h2>
          <ul className="mt-2 space-y-2">
            {resultados.map((a) => (
              <li key={a.slug}>
                <Link href={`/ajuda/${a.slug}`} className="block rounded-xl border border-barro-100 bg-superficie p-4 hover:border-casca-300">
                  <span className="font-semibold text-barro-900">{a.titulo}</span>
                  <span className="mt-0.5 block text-sm text-barro-600">{a.resumo}</span>
                </Link>
              </li>
            ))}
          </ul>
          {resultados.length === 0 && (
            <p className="mt-2 text-sm text-barro-600">
              Tente outras palavras ou{' '}
              <Link href="/ajuda/contato" className="font-semibold text-casca-700 underline">
                fale com o suporte
              </Link>
              .
            </p>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {(Object.keys(CATEGORIAS_AJUDA) as CategoriaAjuda[]).map((categoria) => (
          <section key={categoria} aria-labelledby={`cat-${categoria}`}>
            <h2 id={`cat-${categoria}`} className="font-display text-lg font-semibold text-barro-900">
              {CATEGORIAS_AJUDA[categoria]}
            </h2>
            <ul className="mt-2 space-y-1">
              {ARTIGOS.filter((a) => a.categoria === categoria).map((a) => (
                <li key={a.slug}>
                  <Link href={`/ajuda/${a.slug}`} className="text-barro-700 hover:text-casca-700 hover:underline">
                    {a.titulo}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 h-6 w-6 shrink-0 text-mata-600" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-semibold text-barro-900">Não achou o que precisava?</h2>
            <p className="mt-1 text-sm text-barro-600">Abra um chamado — você acompanha a resposta por aqui e recebe um aviso no app.</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <Link href="/ajuda/contato" className="rounded-lg bg-serra px-3 py-1.5 font-semibold text-white hover:bg-serra">
                Falar com o suporte
              </Link>
              <Link href="/ajuda/chamados" className="rounded-lg border border-barro-300 px-3 py-1.5 font-semibold text-barro-800 hover:bg-barro-50">
                Meus chamados
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
