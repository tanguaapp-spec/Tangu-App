import { buscarNegocios, buscarCategorias } from '@/lib/queries/negocios'
import { CardNegocio } from '@/components/negocio/card-negocio'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'
import { BuscaRapida } from '@/components/busca-rapida'

export default async function PaginaBuscar({
  searchParams,
}: {
  searchParams: { q?: string; categoria?: string }
}) {
  const [negocios, categorias] = await Promise.all([
    buscarNegocios({ termo: searchParams.q, categoriaSlug: searchParams.categoria }),
    buscarCategorias(),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-medium text-barro-900">
        Profissionais e comércios de Tanguá
      </h1>
      <p className="mt-1 text-barro-600">
        {negocios.length} {negocios.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
      </p>

      <div className="mt-6">
        <BuscaRapida />
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
        <span className="flex shrink-0 items-center gap-1 text-sm text-barro-500">
          <SlidersHorizontal className="h-4 w-4" /> Filtrar:
        </span>
        <Link
          href="/buscar"
          className={cn(
            'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
            !searchParams.categoria ? 'bg-casca-500 text-white' : 'bg-white text-barro-700 hover:bg-barro-100'
          )}
        >
          Todas
        </Link>
        {categorias.map((cat) => (
          <Link
            key={cat.id}
            href={`/buscar?categoria=${cat.slug}`}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              searchParams.categoria === cat.slug
                ? 'bg-casca-500 text-white'
                : 'bg-white text-barro-700 hover:bg-barro-100'
            )}
          >
            {cat.nome}
          </Link>
        ))}
      </div>

      {negocios.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-barro-600">Nenhum resultado encontrado por aqui ainda.</p>
          <p className="mt-1 text-barro-500">Tente outro termo ou categoria.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {negocios.map((negocio) => (
            <CardNegocio key={negocio.id} negocio={negocio} />
          ))}
        </div>
      )}
    </div>
  )
}
