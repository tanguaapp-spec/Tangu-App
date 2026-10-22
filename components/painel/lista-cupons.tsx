'use client'

import { useRouter } from 'next/navigation'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Zap, X } from 'lucide-react'
import { encerrarCupom } from '@/lib/actions/painel-negocio-actions'
import { situacaoOferta } from '@/lib/ofertas/desconto'
import type { Cupom } from '@/lib/types/database'

const ROTULO = { agendada: 'Agendada', ativa: 'Valendo', esgotada: 'Esgotada', expirada: 'Terminou', suspensa: 'Encerrada' } as const

export function ListaCupons({ cupons, negocioId }: { cupons: Cupom[]; negocioId: string }) {
  const router = useRouter()

  async function encerrar(cupomId: string) {
    if (!window.confirm('Encerrar esta oferta agora? Quem já pegou o código ainda pode usar até você validar.')) return
    await encerrarCupom(cupomId, negocioId)
    router.refresh()
  }

  // mostra as abertas + as encerradas nos últimos 30 dias (pra ver o resultado)
  const limite = Date.now() - 30 * 86400e3
  const visiveis = cupons.filter((c) => new Date(c.expira_em).getTime() > limite)
  if (visiveis.length === 0) return null

  return (
    <ul className="mb-4 space-y-2">
      {visiveis.map((cupom) => {
        const situacao = situacaoOferta(cupom)
        const aberta = situacao === 'ativa' || situacao === 'agendada' || situacao === 'esgotada'
        return (
          <li key={cupom.id} className="flex items-center justify-between gap-3 rounded-xl border border-casca-200 bg-casca-50 px-4 py-2.5">
            <div className="flex min-w-0 items-start gap-2">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-casca-600" aria-hidden="true" />
              <span className="text-sm text-casca-800">
                <span className="font-semibold">{cupom.titulo}</span> — {cupom.desconto_texto}
                <span className="block text-xs text-casca-700">
                  {ROTULO[situacao]}
                  {situacao === 'ativa' && ` · termina em ${formatDistanceToNowStrict(new Date(cupom.expira_em), { locale: ptBR })}`}
                  {cupom.limite_resgates ? ` · ${cupom.resgates_count ?? 0}/${cupom.limite_resgates} cupons pegos` : ''}
                </span>
              </span>
            </div>
            {aberta && (
              <button onClick={() => encerrar(cupom.id)} className="rounded-full p-1.5 text-casca-600 hover:bg-casca-100" aria-label={`Encerrar oferta ${cupom.titulo}`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
