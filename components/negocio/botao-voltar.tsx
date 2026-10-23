'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

/** Voltar de verdade (mantém a busca/filtros); abriu direto pelo link → Explorar. */
export function BotaoVoltar({ className, padrao = '/buscar' }: { className?: string; padrao?: string }) {
  const router = useRouter()
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => {
        const veioDoApp = typeof document !== 'undefined' && document.referrer.startsWith(window.location.origin)
        if (veioDoApp && window.history.length > 1) router.back()
        else router.push(padrao)
      }}
      className={className}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  )
}
