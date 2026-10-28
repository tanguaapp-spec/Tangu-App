'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { alternarInteresseEvento } from '@/lib/actions/agenda-actions'
import { cn } from '@/lib/utils'
import { vibrar } from '@/lib/ui/vibrar'

export function BotaoInteresse({
  avisoId,
  logado,
  inicial,
  total,
}: {
  avisoId: string
  logado: boolean
  inicial: boolean
  total: number
}) {
  const [interessado, setInteressado] = useState(inicial)
  const [contagem, setContagem] = useState(total)
  const [erro, setErro] = useState<string | null>(null)
  const [pendente, iniciar] = useTransition()

  if (!logado) {
    return (
      <Link
        href="/entrar?next=/agenda"
        className="flex h-11 items-center gap-1.5 rounded-[14px] border-[1.5px] border-barro-200 px-3.5 text-sm font-semibold text-barro-900"
      >
        <Star className="h-4 w-4" aria-hidden="true" /> Tenho interesse
        {contagem > 0 && <span className="font-mono text-xs text-barro-600">{contagem}</span>}
      </Link>
    )
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-pressed={interessado}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null)
            const antes = interessado
            setInteressado(!antes)
            setContagem((c) => c + (antes ? -1 : 1))
            vibrar()
            const r = await chamarAcao(alternarInteresseEvento(avisoId))
            if (r.erro) {
              setInteressado(antes)
              setContagem((c) => c + (antes ? 1 : -1))
              setErro(r.erro)
            }
          })
        }
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-[14px] px-3.5 text-sm font-semibold transition-colors',
          interessado ? 'bg-serra text-white' : 'border-[1.5px] border-barro-200 text-barro-900'
        )}
      >
        <Star className={cn('h-4 w-4', interessado && 'fill-current')} aria-hidden="true" />
        {interessado ? 'Vou avisar você na véspera' : 'Tenho interesse'}
        {contagem > 0 && <span className={cn('font-mono text-xs', interessado ? 'text-white/80' : 'text-barro-600')}>{contagem}</span>}
      </button>
      {erro && (
        <span role="alert" className="mt-1 text-xs text-red-700">
          {erro}
        </span>
      )}
    </div>
  )
}
