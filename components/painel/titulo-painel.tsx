import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

/** Topo das telas internas do painel: título, explicação curta e voltar (celular). */
export function TituloPainel({ titulo, descricao, voltar = '/painel/negocio', acao }: { titulo: string; descricao?: string; voltar?: string | null; acao?: React.ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
      <div className="min-w-0">
        {voltar && (
          <Link href={voltar} className="-ml-1 mb-1 inline-flex h-9 items-center gap-0.5 text-sm font-semibold text-barro-600 md:hidden">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Voltar
          </Link>
        )}
        <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">{titulo}</h1>
        {descricao && <p className="mt-1 max-w-2xl text-sm text-barro-600 md:text-base">{descricao}</p>}
      </div>
      {acao}
    </header>
  )
}

export function CartaoPainel({ id, titulo, descricao, children }: { id?: string; titulo?: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-[24px] border border-barro-200/80 bg-superficie p-4 md:p-6">
      {titulo && <h2 className="font-display text-lg font-bold text-barro-900 md:text-xl">{titulo}</h2>}
      {descricao && <p className="mt-0.5 text-sm text-barro-600">{descricao}</p>}
      <div className={titulo || descricao ? 'mt-4' : ''}>{children}</div>
    </section>
  )
}
