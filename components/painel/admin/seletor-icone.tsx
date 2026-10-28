'use client'

import { useState } from 'react'
import { ICONES_CATEGORIA, iconeCategoria } from '@/lib/ui/icone-categoria'
import { cn } from '@/lib/utils'

/** Grade de ícones para escolher com um toque (grava o nome no campo "icone"). */
export function SeletorIcone({ valorInicial, nome = 'icone' }: { valorInicial?: string | null; nome?: string }) {
  const [valor, setValor] = useState(valorInicial && ICONES_CATEGORIA.includes(valorInicial) ? valorInicial : 'store')
  const [aberto, setAberto] = useState(false)
  const Atual = iconeCategoria(valor)
  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={nome} value={valor} />
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="flex min-h-11 items-center gap-2 self-start rounded-xl border border-barro-200 bg-superficie px-3 text-sm font-semibold text-barro-900"
      >
        <Atual className="h-5 w-5 text-mata-700" aria-hidden="true" /> {aberto ? 'Fechar ícones' : 'Trocar ícone'}
      </button>
      {aberto && (
        <div role="radiogroup" aria-label="Ícone da categoria" className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5 rounded-xl border border-barro-200 bg-superficie p-2">
          {ICONES_CATEGORIA.map((n) => {
            const Icone = iconeCategoria(n)
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={valor === n}
                aria-label={n}
                title={n}
                onClick={() => {
                  setValor(n)
                  setAberto(false)
                }}
                className={cn('flex h-11 items-center justify-center rounded-lg', valor === n ? 'bg-serra text-white' : 'text-barro-800 hover:bg-barro-100')}
              >
                <Icone className="h-5 w-5" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
