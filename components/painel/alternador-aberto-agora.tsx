'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { alternarAbertoAgora } from '@/lib/actions/painel-negocio-actions'

export function AlternadorAbertoAgora({ negocioId, valorInicial }: { negocioId: string; valorInicial: boolean | null }) {
  const router = useRouter()
  const [valor, setValor] = useState(valorInicial ?? false)
  const [carregando, setCarregando] = useState(false)

  async function alternar() {
    const novoValor = !valor
    setValor(novoValor)
    setCarregando(true)
    await alternarAbertoAgora(negocioId, novoValor)
    setCarregando(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={carregando}
      className={cn(
        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60',
        valor ? 'bg-mata-100 text-mata-700' : 'bg-barro-100 text-barro-600'
      )}
    >
      <span className={cn('h-2.5 w-2.5 rounded-full', valor ? 'bg-mata-500' : 'bg-barro-400')} />
      {valor ? 'Aberto agora' : 'Fechado agora'}
      <span className="text-xs font-normal text-barro-400">(clique pra mudar)</span>
    </button>
  )
}
