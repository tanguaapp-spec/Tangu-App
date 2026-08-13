'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { alternarReacao } from '@/lib/actions/mural-actions'
import type { TipoReacaoAviso } from '@/lib/types/database'

const OPCOES: { tipo: TipoReacaoAviso; emoji: string; rotulo: string }[] = [
  { tipo: 'gostei', emoji: '👏', rotulo: 'Gostei' },
  { tipo: 'parabens', emoji: '🎉', rotulo: 'Parabéns' },
  { tipo: 'obrigado', emoji: '🙏', rotulo: 'Obrigado' },
]

interface Props {
  avisoId: string
  contagens: Record<string, number>
  minhaReacao?: string
  logado: boolean
}

export function ReacoesAviso({ avisoId, contagens, minhaReacao, logado }: Props) {
  const router = useRouter()
  const [pendente, startTransition] = useTransition()

  function reagir(tipo: TipoReacaoAviso) {
    if (!logado || pendente) return
    startTransition(async () => {
      await alternarReacao(avisoId, tipo)
      router.refresh()
    })
  }

  return (
    <div className="mt-3 flex gap-1.5">
      {OPCOES.map((opcao) => {
        const ativa = minhaReacao === opcao.tipo
        const total = contagens[opcao.tipo] ?? 0
        return (
          <button
            key={opcao.tipo}
            onClick={() => reagir(opcao.tipo)}
            disabled={!logado}
            title={logado ? opcao.rotulo : 'Entre pra reagir'}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              ativa ? 'border-casca-400 bg-casca-50 text-casca-700' : 'border-barro-200 text-barro-600 hover:bg-barro-50'
            }`}
          >
            <span>{opcao.emoji}</span>
            {total > 0 && <span>{total}</span>}
          </button>
        )
      })}
    </div>
  )
}
