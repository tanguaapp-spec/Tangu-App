'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Revela o conteúdo (fade + leve subida) quando ele entra na viewport.
 * IntersectionObserver nativo — sem biblioteca de animação, poucochar de JS.
 */
export function Revelar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const elemento = ref.current
    if (!elemento) return

    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    )

    observer.observe(elemento)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={cn('revelar', visivel && 'revelar-visivel', className)}>
      {children}
    </div>
  )
}
