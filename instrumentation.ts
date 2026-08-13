import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// captura erros de Server Components / Server Actions que não passam pelo
// error.tsx do App Router (esses o próprio error.tsx já reporta na mão).
export const onRequestError = Sentry.captureRequestError
