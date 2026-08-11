'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Botao } from '@/components/ui/botao'

export function BotaoCopiarLink({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard indisponível (ex: http sem contexto seguro) — ignora silenciosamente
    }
  }

  return (
    <Botao type="button" variante="fantasma" tamanho="sm" onClick={copiar}>
      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copiado ? 'Link copiado!' : 'Copiar link'}
    </Botao>
  )
}
