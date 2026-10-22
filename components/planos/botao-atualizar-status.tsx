'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { atualizarStatusAssinatura } from '@/lib/actions/assinatura-actions'

/** Re-consulta o Mercado Pago pelo servidor — não concede nada sozinho. */
export function BotaoAtualizarStatus() {
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()
  return (
    <Botao
      variante="fantasma"
      tamanho="sm"
      carregando={carregando}
      onClick={async () => {
        setCarregando(true)
        await atualizarStatusAssinatura()
        setCarregando(false)
        router.refresh()
      }}
    >
      {!carregando && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
      Verificar pagamento
    </Botao>
  )
}
