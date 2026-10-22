import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ARTIGOS, CATEGORIAS_AJUDA, artigoPorSlug } from '@/lib/ajuda/artigos'

export function generateStaticParams() {
  return ARTIGOS.map((a) => ({ slug: a.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const artigo = artigoPorSlug(params.slug)
  if (!artigo) return { title: 'Ajuda' }
  return { title: artigo.titulo, description: artigo.resumo, alternates: { canonical: `/ajuda/${artigo.slug}` } }
}

export default function PaginaArtigoAjuda({ params }: { params: { slug: string } }) {
  const artigo = artigoPorSlug(params.slug)
  if (!artigo) notFound()

  const relacionados = ARTIGOS.filter((a) => a.categoria === artigo.categoria && a.slug !== artigo.slug).slice(0, 3)

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/ajuda" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 hover:text-casca-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Central de ajuda
      </Link>
      <p className="text-sm font-medium text-casca-700">{CATEGORIAS_AJUDA[artigo.categoria]}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">{artigo.titulo}</h1>
      <p className="mt-2 text-lg text-barro-700">{artigo.resumo}</p>

      <ol className="mt-6 space-y-3">
        {artigo.passos.map((passo, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-casca-100 text-sm font-bold text-casca-800" aria-hidden="true">
              {i + 1}
            </span>
            <span className="pt-0.5 text-barro-800">{passo}</span>
          </li>
        ))}
      </ol>

      {artigo.observacoes && artigo.observacoes.length > 0 && (
        <div className="mt-6 rounded-xl bg-barro-50 p-4">
          <h2 className="text-sm font-semibold text-barro-800">Bom saber</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-barro-700">
            {artigo.observacoes.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {artigo.links && artigo.links.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {artigo.links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-lg bg-casca-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-casca-800">
              {l.rotulo}
            </Link>
          ))}
        </div>
      )}

      <p className="mt-10 border-t border-barro-100 pt-4 text-sm text-barro-600">
        Ainda com dúvida?{' '}
        <Link href={`/ajuda/contato?artigo=${artigo.slug}`} className="font-semibold text-casca-700 underline">
          Fale com o suporte
        </Link>
        .
      </p>

      {relacionados.length > 0 && (
        <nav aria-label="Artigos relacionados" className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-barro-500">Relacionados</h2>
          <ul className="mt-2 space-y-1">
            {relacionados.map((r) => (
              <li key={r.slug}>
                <Link href={`/ajuda/${r.slug}`} className="text-barro-700 hover:text-casca-700 hover:underline">
                  {r.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </article>
  )
}
