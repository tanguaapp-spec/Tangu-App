'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { removerAviso } from '@/lib/actions/admin-actions'

export function BotaoRemoverAviso({ avisoId }: { avisoId: string }) {
  const [carregando, setCarregando] = useState(false)

  async function handleClick() {
    setCarregando(true)
    await removerAviso(avisoId)
    setCarregando(false)
  }

  return (
    <Botao tamanho="sm" variante="fantasma" carregando={carregando} onClick={handleClick}>
      Remover
    </Botao>
  )
}
