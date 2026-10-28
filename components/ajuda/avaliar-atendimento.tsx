'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { avaliarAtendimento } from '@/lib/actions/suporte-actions'
import { cn } from '@/lib/utils'

/** "Como foi o atendimento?" de 1 a 5 estrelas, depois que o suporte respondeu. */
export function AvaliarAtendimento({ chamadoId }: { chamadoId: string }) {
  const [nota, setNota] = useState(0)
  const [estado, setEstado] = useState<'aberto' | 'enviando' | 'ok'>('aberto')
  const [erro, setErro] = useState<string | null>(null)
  if (estado === 'ok') return <p className="rounded-xl bg-mata-50 p-3 text-sm text-mata-800">Obrigado pela avaliação!</p>
  return (
    <section aria-label="Avaliar atendimento" className="flex flex-col gap-2 rounded-casca border border-barro-100 bg-superficie p-4">
      <b className="text-barro-900">Como foi o atendimento?</b>
      <div role="radiogroup" aria-label="Nota de 1 a 5" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={nota === n}
            aria-label={`${n} de 5`}
            disabled={estado === 'enviando'}
            onClick={async () => {
              setNota(n)
              setEstado('enviando')
              const fd = new FormData()
              fd.set('chamado_id', chamadoId)
              fd.set('nota', String(n))
              const r = await chamarAcao(avaliarAtendimento(fd))
              if (r.erro) {
                setErro(r.erro)
                setEstado('aberto')
              } else setEstado('ok')
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl"
          >
            <Star className={cn('h-7 w-7', n <= nota ? 'fill-laranja text-laranja' : 'text-barro-300')} aria-hidden="true" />
          </button>
        ))}
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </section>
  )
}
