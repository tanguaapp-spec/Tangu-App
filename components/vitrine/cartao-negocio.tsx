import Link from 'next/link'
import { FotoNegocio } from '@/components/vitrine/foto-negocio'
import { metaNegocio, urlNegocio, type NegocioResumo } from '@/lib/ui/apresentacao'
import { cn } from '@/lib/utils'

/** Cartão com foto do protótipo ("Mais procurados"): 2 colunas no celular. */
export function CartaoNegocio({
  negocio,
  origem,
  className,
}: {
  negocio: NegocioResumo
  origem?: string
  className?: string
}) {
  return (
    <Link
      href={`${urlNegocio(negocio)}${origem ? `?origem=${origem}` : ''}`}
      className={cn(
        'block overflow-hidden rounded-[20px] border border-barro-200/80 bg-superficie text-barro-900 transition-transform active:scale-[0.98] md:rounded-[22px]',
        className
      )}
    >
      <FotoNegocio
        id={negocio.id}
        url={negocio.foto_capa_url}
        nome={negocio.nome}
        icone={negocio.categoria?.icone}
        className="h-24 w-full md:h-[140px]"
      />
      <span className="block px-3 py-2.5 md:px-3.5 md:py-3">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold">{negocio.nome}</span>
          {negocio.destaque_ativo && (
            <span className="shrink-0 rounded-full bg-casca-100 px-1.5 py-px text-xs font-bold text-casca-800">Destaque</span>
          )}
        </span>
        <span className="block truncate text-xs text-barro-600 md:text-[13px]">{metaNegocio(negocio, { comBairro: true })}</span>
      </span>
    </Link>
  )
}
