import Link from 'next/link'
import { Stamp } from 'lucide-react'
import type { CartaoFidelidade } from '@/lib/types/database'

export function CartoesFidelidade({ cartoes }: { cartoes: CartaoFidelidade[] }) {
  if (cartoes.length === 0) return null

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-barro-500">Seus cartões fidelidade</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {cartoes.map((cartao) => {
          const completo = cartao.carimbos >= cartao.meta
          return (
            <Link
              key={cartao.id}
              href={`/negocio/${cartao.negocio_id}`}
              className="rounded-xl border border-barro-100 bg-white p-4 transition-colors hover:border-casca-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-barro-900">{cartao.negocio?.nome}</span>
                <Stamp className={`h-4 w-4 ${completo ? 'text-casca-500' : 'text-barro-300'}`} />
              </div>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: cartao.meta }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${i < cartao.carimbos ? 'bg-casca-500' : 'bg-barro-100'}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-barro-500">
                {completo
                  ? 'Completo! Mostre esse cartão pro dono resgatar seu prêmio.'
                  : `${cartao.carimbos}/${cartao.meta} carimbos`}
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
