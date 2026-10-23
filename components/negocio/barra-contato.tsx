'use client'

import { cn } from '@/lib/utils'
import { useTecladoAberto } from '@/components/layout/use-teclado-aberto'

/** Barra de WhatsApp/Orçamento do perfil: fica logo acima da navegação e some com o teclado. */
export function BarraContato({ children }: { children: React.ReactNode }) {
  const teclado = useTecladoAberto()
  return (
    <div
      className={cn(
        'barra-fixa fixed inset-x-0 bottom-[var(--altura-nav)] z-30 flex gap-2.5 border-t border-barro-200/80 bg-superficie/95 px-4 py-2.5 backdrop-blur transition-opacity duration-150 md:hidden',
        teclado && 'pointer-events-none opacity-0'
      )}
    >
      {children}
    </div>
  )
}
