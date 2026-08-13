'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Zap, X } from 'lucide-react'
import { encerrarCupom } from '@/lib/actions/painel-negocio-actions'
import type { Cupom } from '@/lib/types/database'

export function ListaCupons({ cupons, negocioId }: { cupons: Cupom[]; negocioId: string }) {
  const router = useRouter()

  async function encerrar(cupomId: string) {
    await encerrarCupom(cupomId, negocioId)
    router.refresh()
  }

  const vigentes = cupons.filter((c) => c.ativo && new Date(c.expira_em) > new Date())
  if (vigentes.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {vigentes.map((cupom) => (
        <div key={cupom.id} className="flex items-center justify-between gap-3 rounded-xl border border-casca-200 bg-casca-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-casca-600" />
            <span className="text-sm text-casca-800">
              <span className="font-semibold">{cupom.titulo}</span> — {cupom.desconto_texto}
              <span className="ml-2 text-xs text-casca-600">
                termina em {formatDistanceToNowStrict(new Date(cupom.expira_em), { locale: ptBR })}
              </span>
            </span>
          </div>
          <button
            onClick={() => encerrar(cupom.id)}
            className="rounded-full p-1 text-casca-500 hover:bg-casca-100"
            aria-label="Encerrar oferta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
