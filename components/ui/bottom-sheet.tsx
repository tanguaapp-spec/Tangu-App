'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Modal que sobe de baixo, padrão nativo mobile (em vez de expandir inline
 * na página). Renderiza via portal direto no body — evita brigar com
 * z-index/overflow de qualquer container pai.
 */
export function BottomSheet({
  aberto,
  onFechar,
  titulo,
  children,
}: {
  aberto: boolean
  onFechar: () => void
  titulo?: string
  children: React.ReactNode
}) {
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = ''
    }
  }, [aberto, onFechar])

  if (!montado || !aberto) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="bottom-sheet-overlay absolute inset-0 bg-black/50" onClick={onFechar} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="bottom-sheet-painel relative w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-barro-200 sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          {titulo && <h3 className="font-display text-lg font-semibold text-barro-900">{titulo}</h3>}
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="ml-auto rounded-full p-1.5 text-barro-400 hover:bg-barro-100 hover:text-barro-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body
  )
}
