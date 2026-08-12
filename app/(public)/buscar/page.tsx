import { buscarNegocios, buscarCategorias, buscarBairros } from '@/lib/queries/negocios'
import { CardNegocio } from '@/components/negocio/card-negocio'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { SlidersHorizontal, MapPin, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { BuscaRapida } from '@/components/busca-rapida'

export const revalidate = 60

type ParamsBusca = { q?: string; categoria?: string; bairro?: string; pagina?: string }

function linkFiltro(searchParams: ParamsBusca, sobrescreve: { categoria?: string | null; bairro?: string | null }) {
  const params = new URLSearchParams()
  if (searchParams.q) params.set('q', searchParams.q)

  const categoria = 'categoria' in sobrescreve ? sobrescreve.categoria : searchParams.categoria
  const bairro = 'bairro' in sobrescreve ? sobrescreve.bairro : searchParams.bairro

  if (categoria) params.set('categoria', categoria)
  if (bairro) params.set('bairro', bairro)
  // trocar de filtro sempre volta pra página 1

  const query = params.toString()
  return query ? `/buscar?${query}` : '/buscar'
}

function linkPagina(searchParams: ParamsBusca, pagina: number) {
  const params = new URLSearchParams()
  if (searchParams.q) params.set('q', searchParams.q)
  if (searchParams.categoria) params.set('categoria', searchParams.categoria)
  if (searchParams.bairro) params.set('bairro', searchParams.bairro)
  if (pagina > 1) params.set('pagina', String(pagina))

  const query = params.toString()
  return query ? `/buscar?${query}` : '/buscar'
}

export default async function PaginaBuscar({ searchParams }: { searchParams: ParamsBusca }) {
  const paginaAtual = Math.max(1, Number(searchParams.pagina) || 1)

  const [{ negocios, total, porPagina }, categorias, bairros] = await Promise.all([
    buscarNegocios({
      termo: searchParams.q,
      categoriaSlug: searchParams.categoria,
      bairro: searchParams.bairro,
      pagina: paginaAtual,
    }),
    buscarCategorias(),
    buscarBairros(),
  ])

  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">
        Profissionais e comércios de Tanguá
      </h1>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-barro-600">
        <span>{total} {total === 1 ? 'resultado encontrado' : 'resultados encontrados'}</span>
        <span className="flex items-center gap-1 text-sm text-mata-700">
          <ShieldCheck className="h-3.5 w-3.5" /> todos checados pela nossa equipe
        </span>
      </p>

      <div className="mt-6">
        <BuscaRapida />
      </div>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
        <span className="flex shrink-0 items-center gap-1 text-sm text-barro-500">
          <SlidersHorizontal className="h-4 w-4" /> Filtrar:
        </span>
        <Link
          href={linkFiltro(searchParams, { categoria: null })}
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
            href={linkFiltro(searchParams, { categoria: cat.slug })}
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

      {bairros.length > 0 && (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="flex shrink-0 items-center gap-1 text-sm text-barro-500">
            <MapPin className="h-4 w-4" /> Bairro:
          </span>
          <Link
            href={linkFiltro(searchParams, { bairro: null })}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              !searchParams.bairro ? 'bg-mata-500 text-white' : 'bg-white text-barro-700 hover:bg-barro-100'
            )}
          >
            Todos
          </Link>
          {bairros.map((bairro) => (
            <Link
              key={bairro}
              href={linkFiltro(searchParams, { bairro })}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                searchParams.bairro === bairro
                  ? 'bg-mata-500 text-white'
                  : 'bg-white text-barro-700 hover:bg-barro-100'
              )}
            >
              {bairro}
            </Link>
          ))}
        </div>
      )}

      {negocios.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-barro-600">Nenhum resultado encontrado por aqui ainda.</p>
          <p className="mt-1 text-barro-500">Tente outro termo ou categoria.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {negocios.map((negocio, i) => (
              <CardNegocio key={negocio.id} negocio={negocio} indice={i} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Paginação">
              <Link
                href={linkPagina(searchParams, paginaAtual - 1)}
                aria-disabled={paginaAtual <= 1}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  paginaAtual <= 1
                    ? 'pointer-events-none text-barro-300'
                    : 'text-barro-700 hover:bg-barro-100'
                )}
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>

              <span className="px-3 text-sm text-barro-500">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <Link
                href={linkPagina(searchParams, paginaAtual + 1)}
                aria-disabled={paginaAtual >= totalPaginas}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  paginaAtual >= totalPaginas
                    ? 'pointer-events-none text-barro-300'
                    : 'text-barro-700 hover:bg-barro-100'
                )}
              >
                Próxima <ChevronRight className="h-4 w-4" />
              </Link>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
