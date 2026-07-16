'use client'

import { Heart } from 'lucide-react'
import { useTransition, useState } from 'react'
import { alternarFavorito } from '@/lib/actions/negocio-actions'

interface Props {
  negocioId: string
  initialIsFavorito: boolean
}

export function BotaoFavoritar({ negocioId, initialIsFavorito }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isFavorito, setIsFavorito] = useState(initialIsFavorito)

  const handleClick = async () => {
    startTransition(async () => {
      setIsFavorito(!isFavorito)
      await alternarFavorito(negocioId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="p-2 rounded-full hover:bg-white/50 transition-colors"
    >
      <Heart
        className={`w-5 h-5 ${
          isFavorito ? 'fill-casca-500 text-casca-500' : 'text-barro-400'
        }`}
      />
    </button>
  )
}
