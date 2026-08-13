'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

const LIMIAR_ATUALIZAR = 70
const LIMIAR_MAXIMO = 110

/**
 * Puxar a tela pra baixo, no topo, atualiza a página — gesto que quem usa
 * app já conhece. Só ativa quando o toque começa com a página já rolada
 * até o topo (scrollY 0), pra nunca interferir com rolagem normal.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [distancia, setDistancia] = useState(0)
  const [atualizando, setAtualizando] = useState(false)
  const puxando = useRef(false)
  const inicioY = useRef(0)

  function aoTocar(e: React.TouchEvent) {
    if (window.scrollY > 0 || atualizando) return
    puxando.current = true
    inicioY.current = e.touches[0].clientY
  }

  function aoMover(e: React.TouchEvent) {
    if (!puxando.current) return
    const delta = e.touches[0].clientY - inicioY.current
    if (delta <= 0) {
      setDistancia(0)
      return
    }
    // resistência: puxar fica cada vez mais "duro" quanto mais estica
    const comResistencia = Math.min(LIMIAR_MAXIMO, delta * 0.45)
    setDistancia(comResistencia)
  }

  function aoSoltar() {
    if (!puxando.current) return
    puxando.current = false
    if (distancia >= LIMIAR_ATUALIZAR) {
      setAtualizando(true)
      setDistancia(LIMIAR_ATUALIZAR)
      router.refresh()
      // dá um tempo mínimo pro spinner não só "piscar" em conexões rápidas
      setTimeout(() => {
        setAtualizando(false)
        setDistancia(0)
      }, 700)
    } else {
      setDistancia(0)
    }
  }

  const progresso = Math.min(1, distancia / LIMIAR_ATUALIZAR)

  return (
    <div
      className="flex flex-1 flex-col"
      onTouchStart={aoTocar}
      onTouchMove={aoMover}
      onTouchEnd={aoSoltar}
      onTouchCancel={aoSoltar}
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-center overflow-hidden md:hidden"
        style={{
          height: distancia,
          transition: puxando.current ? 'none' : 'height 200ms ease-out',
        }}
      >
        <RefreshCw
          className={atualizando ? 'ptr-girando h-5 w-5 text-casca-500' : 'h-5 w-5 text-casca-500'}
          style={{
            opacity: progresso,
            transform: atualizando ? undefined : `rotate(${progresso * 220}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  )
}
