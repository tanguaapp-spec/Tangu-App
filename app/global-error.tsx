'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Só entra em ação se o próprio app/layout.tsx (root layout) quebrar — o
// error.tsx normal não cobre esse caso porque ele também faz parte da árvore
// que quebrou. Como substitui o layout inteiro, precisa renderizar <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro no layout raiz:', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'sans-serif', textAlign: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>Algo deu muito errado</h1>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              Não conseguimos carregar o Tanguá App agora. Tente de novo em instantes.
            </p>
            <button
              onClick={reset}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '9999px', background: '#C46A1F', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
