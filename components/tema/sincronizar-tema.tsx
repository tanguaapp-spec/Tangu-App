'use client'

import { useEffect } from 'react'
import { lerPreferencia, temaEfetivoEscuro } from '@/lib/tema/preferencia'

/**
 * Rede de segurança do tema: o script do <head> aplica html.dark antes da
 * pintura, mas se o React precisar recriar a raiz no navegador (erro de
 * hidratação, troca de versão no meio da visita) a classe some. Este
 * componente reaplica a preferência depois de montar e também quando o
 * sistema muda de claro para escuro com a preferência em "Automático".
 */
export function SincronizarTema() {
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aplicar = () => {
      document.documentElement.classList.toggle('dark', temaEfetivoEscuro(lerPreferencia(), consulta.matches))
    }
    aplicar()
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [])
  return null
}
