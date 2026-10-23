'use client'

import { useEffect } from 'react'
import { useSessao } from '@/components/layout/sessao'

/** Recarrega a sessão ao montar (ex.: zerar o sino depois de abrir as notificações). */
export function AtualizarSessao() {
  const { recarregar } = useSessao()
  useEffect(() => {
    recarregar()
  }, [recarregar])
  return null
}
