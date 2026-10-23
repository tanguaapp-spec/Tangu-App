import Link from 'next/link'
import { cn } from '@/lib/utils'
import { prazoCurto, precoCurto, seloOferta, urlNegocio, type OfertaResumo } from '@/lib/ui/apresentacao'

/**
 * Cartão de oferta do protótipo: pêssego com "-25%" quando há preço de/por
 * (percentual calculado), branco com o texto do dono quando não há.
 */
export function CartaoOferta({ oferta, className, grande = false }: { oferta: OfertaResumo; className?: string; grande?: boolean }) {
  const selo = seloOferta(oferta)
  const href = oferta.negocio ? `${urlNegocio(oferta.negocio)}?origem=ofertas#oferta` : '/ofertas'
  const temPreco =
    selo.percentual && !!oferta.preco_original_centavos && oferta.preco_promocional_centavos !== null && oferta.preco_promocional_centavos !== undefined
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col gap-1.5 rounded-[22px] p-4 text-barro-900 transition-transform active:scale-[0.98]',
        selo.percentual ? 'bg-casca-100' : 'border border-barro-200/80 bg-superficie',
        grande && 'p-[18px]',
        className
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'truncate rounded-[10px] px-2 py-1 text-[13px] font-bold',
            selo.percentual ? 'bg-barro-900 font-mono text-feira' : 'bg-mata-100 text-mata-700'
          )}
        >
          {selo.texto}
        </span>
        <span className="shrink-0 font-mono text-xs font-bold text-casca-800">{prazoCurto(oferta.expira_em)}</span>
      </span>
      <span className={cn('font-display font-bold leading-tight', grande ? 'text-xl' : 'text-[19px]')}>{oferta.titulo}</span>
      {oferta.negocio && (
        <span className="truncate text-sm text-barro-700">
          {oferta.negocio.nome}
          {oferta.negocio.bairro ? ` · ${oferta.negocio.bairro}` : ''}
        </span>
      )}
      {temPreco && (
        <span className="text-sm">
          de <s>{precoCurto(oferta.preco_original_centavos!)}</s> por{' '}
          <b className="font-mono text-mata-700">{precoCurto(oferta.preco_promocional_centavos!)}</b>
        </span>
      )}
    </Link>
  )
}
