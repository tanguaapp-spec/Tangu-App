'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { vibrar } from '@/lib/ui/vibrar'
import { cn } from '@/lib/utils'

/**
 * Abre o menu de compartilhar de verdade do celular (Web Share API) —
 * Instagram, SMS, e-mail, WhatsApp, o que a pessoa tiver instalado. Sem
 * suporte (desktop, navegadores mais antigos), cai pra copiar o link.
 */
export function BotaoCompartilhar({
  titulo,
  texto,
  url,
  className,
  rotulo = 'Compartilhar',
  iconApenas = false,
}: {
  titulo: string
  texto?: string
  url: string
  className?: string
  rotulo?: string
  /** só o ícone, sem texto — pra usar num botão redondo compacto */
  iconApenas?: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  async function compartilhar() {
    vibrar(10)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: titulo, text: texto, url })
      } catch {
        // usuário cancelou o menu de compartilhar — não é erro
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard indisponível — sem fallback melhor aqui
    }
  }

  return (
    <button
      type="button"
      onClick={compartilhar}
      title={iconApenas ? rotulo || 'Compartilhar' : undefined}
      aria-label={iconApenas ? rotulo || 'Compartilhar' : undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-colors',
        iconApenas ? 'rounded-full' : 'gap-2 rounded-xl',
        className
      )}
    >
      {copiado ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {!iconApenas && (copiado ? 'Link copiado!' : rotulo)}
    </button>
  )
}
