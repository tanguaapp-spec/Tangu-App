'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Barra fina no topo que aparece no instante do toque em qualquer link
 * interno e some quando a nova tela chega. O App Router não tem eventos de
 * navegação, então: começa no clique (captura) e termina quando o endereço
 * muda. Sem isso, em rede lenta a pessoa toca e acha que nada aconteceu.
 */
function Barra() {
  const pathname = usePathname()
  const busca = useSearchParams()
  const [progresso, setProgresso] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const seguranca = useRef<ReturnType<typeof setTimeout> | null>(null)

  const parar = () => {
    if (timer.current) clearInterval(timer.current)
    if (seguranca.current) clearTimeout(seguranca.current)
    timer.current = null
  }

  // endereço mudou → completa e esconde
  useEffect(() => {
    if (progresso === null) return
    parar()
    setProgresso(100)
    const t = setTimeout(() => setProgresso(null), 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, busca])

  useEffect(() => {
    const iniciar = () => {
      parar()
      setProgresso(8)
      // avança devagar até 90% enquanto espera o servidor
      timer.current = setInterval(() => setProgresso((p) => (p === null ? p : Math.min(90, p + (90 - p) * 0.12))), 200)
      // nunca fica presa (ex.: link que só muda o #)
      seguranca.current = setTimeout(() => {
        parar()
        setProgresso(null)
      }, 12000)
    }
    const aoClicar = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      let destino: URL
      try {
        destino = new URL(href, location.href)
      } catch {
        return
      }
      if (destino.origin !== location.origin) return
      if (destino.pathname === location.pathname && destino.search === location.search) return
      iniciar()
    }
    document.addEventListener('click', aoClicar, true)
    return () => {
      document.removeEventListener('click', aoClicar, true)
      parar()
    }
  }, [])

  if (progresso === null) return null
  return (
    <div
      role="progressbar"
      aria-label="Carregando"
      aria-valuenow={Math.round(progresso)}
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-casca-500 shadow-[0_0_8px_rgba(242,106,27,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progresso}%` }}
      />
    </div>
  )
}

export function BarraProgresso() {
  return (
    <Suspense fallback={null}>
      <Barra />
    </Suspense>
  )
}
