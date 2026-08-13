import Link from 'next/link'
import { iconeCategoria } from '@/lib/ui/icone-categoria'
import type { Negocio } from '@/lib/types/database'

export function CardAchadoDoDia({ negocio }: { negocio: Negocio }) {
  const Icone = iconeCategoria(negocio.categoria?.icone)
  const subtitulo = [negocio.categoria?.nome, negocio.bairro].filter(Boolean).join(' · ')

  return (
    <Link
      href={`/negocio/${negocio.id}`}
      className="flex items-center gap-3 rounded-2xl bg-casca-500 p-4 text-white shadow-feira transition-transform active:scale-[0.98]"
    >
      <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/25">
        <Icone className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-semibold">{negocio.nome}</span>
        {subtitulo && <span className="block truncate text-sm text-casca-50">{subtitulo}</span>}
      </span>
      <span className="shrink-0 rounded-full bg-barro-900 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white">
        HOJE
      </span>
    </Link>
  )
}
