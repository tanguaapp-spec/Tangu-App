'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Interruptor liga/desliga que salva na hora (grade de planos, módulos,
 * serviços pagos). Mostra o novo estado antes da resposta e volta se falhar.
 */
export function InterruptorAcao({
  ligado,
  acao,
  campos,
  rotulo,
}: {
  ligado: boolean
  acao: (formData: FormData) => Promise<{ erro?: string | null }>
  campos: Record<string, string>
  /** texto para leitor de tela, ex.: "Pedidos pelo WhatsApp no plano Essencial" */
  rotulo: string
}) {
  const [estado, setEstado] = useState(ligado)
  useEffect(() => setEstado(ligado), [ligado])
  const [pendente, iniciar] = useTransition()
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)

  return (
    <span className="inline-flex flex-col items-center gap-1">
    <button
      type="button"
      role="switch"
      aria-checked={estado}
      aria-label={rotulo}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          setEstado(!estado)
          const fd = new FormData()
          for (const [k, v] of Object.entries(campos)) fd.set(k, v)
          const r = await chamarAcao(acao(fd))
          if (r.erro) {
            setEstado(estado)
            setErro(r.erro)
          } else setErro(null)
          router.refresh()
        })
      }
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-casca-500 disabled:opacity-70',
        estado ? 'bg-mata-700' : 'bg-barro-300'
      )}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', estado ? 'translate-x-6' : 'translate-x-1')} />
    </button>
    {erro && <span role="alert" className="max-w-[160px] text-xs text-red-700">{erro}</span>}
    </span>
  )
}
