'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { encerrarVaga } from '@/lib/actions/admin-actions'

export function BotaoEncerrarVaga({ vagaId }: { vagaId: string }) {
  const [carregando, setCarregando] = useState(false)

  async function handleClick() {
    setCarregando(true)
    await encerrarVaga(vagaId)
    setCarregando(false)
  }

  return (
    <Botao tamanho="sm" variante="fantasma" carregando={carregando} onClick={handleClick}>
      Encerrar
    </Botao>
  )
}
