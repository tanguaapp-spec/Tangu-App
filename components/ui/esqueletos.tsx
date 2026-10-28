import { Skeleton } from '@/components/ui/skeleton'

/**
 * Telas de carregamento (loading.tsx) — aparecem no mesmo instante do toque,
 * enquanto o servidor monta a página. Cada rota escolhe o formato mais
 * parecido com o que vai abrir, pra troca não "pular".
 */

function Cabecalho() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
    </div>
  )
}

/** Lista de cartões (ofertas, agenda, mural, vagas, favoritos, notificações). */
export function EsqueletoLista({ itens = 6, colunas = true }: { itens?: number; colunas?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 pb-10 pt-5 md:px-6 md:pt-8">
      <Cabecalho />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className={colunas ? 'grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col gap-3'}>
        {Array.from({ length: itens }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3">
            <Skeleton className="h-[76px] w-[76px] shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Página de texto/formulário de uma coluna (ajuda, orçamento, planos, login). */
export function EsqueletoFormulario({ campos = 4 }: { campos?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="mx-auto flex w-full max-w-xl flex-col gap-5 px-5 pb-10 pt-5 md:pt-10">
      <Cabecalho />
      {Array.from({ length: campos }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-[14px]" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-[14px]" />
    </div>
  )
}

/** Telas do painel (admin e negócio): números no topo e uma tabela/lista. */
export function EsqueletoPainel() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex w-full flex-col gap-6">
      <Cabecalho />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
