'use client'

import { Printer } from 'lucide-react'

export function BotaoImprimir({ rotulo = 'Imprimir' }: { rotulo?: string } = {}) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-laranja px-5 font-bold text-tinta">
      <Printer className="h-4 w-4" aria-hidden="true" /> {rotulo}
    </button>
  )
}
