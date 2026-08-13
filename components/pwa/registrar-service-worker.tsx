'use client'

import { useEffect } from 'react'

/**
 * Registra o service worker gerado pelo next-pwa (public/sw.js).
 *
 * O next-pwa v5 injeta a chamada de registro automaticamente só em projetos
 * com Pages Router (via patch no `_document`) — este projeto usa App Router,
 * que não tem `_document`, então essa injeção nunca acontecia. Resultado:
 * o /sw.js sempre foi gerado e servido certinho, mas nenhum navegador jamais
 * chamava `serviceWorker.register()` — ou seja, push notification, cache
 * offline e "adicionar à tela inicial" nunca funcionaram de verdade em
 * produção, silenciosamente (achado via teste E2E real de push, não em code
 * review). Este componente é o registro que faltava.
 */
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Falha ao registrar service worker:', err)
    })
  }, [])

  return null
}
