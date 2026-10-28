import Link from 'next/link'
import { cn } from '@/lib/utils'

export function TituloSecao({
  titulo,
  descricao,
  href,
  rotuloLink = 'Ver todas',
  id,
  className,
}: {
  titulo: string
  descricao?: string
  href?: string
  rotuloLink?: string
  id?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl font-bold text-barro-900 md:text-[28px]">
          {titulo}
        </h2>
        {descricao && <p className="mt-0.5 text-[13px] text-barro-600 md:mt-1 md:text-base">{descricao}</p>}
      </div>
      {href && (
        <Link href={href} className="-my-3 inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-bold text-casca-700 hover:underline md:text-base">
          {rotuloLink}
        </Link>
      )}
    </div>
  )
}
