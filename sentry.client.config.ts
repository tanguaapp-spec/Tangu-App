import * as Sentry from '@sentry/nextjs'

// DSN só existe depois que a variável NEXT_PUBLIC_SENTRY_DSN for cadastrada
// (local e na Vercel) — sem ela, o SDK fica desligado e isso não quebra nada.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: !!dsn,
  tracesSampleRate: 0.1,
  // sem gravação de sessão por padrão — só ativa replay em cima de um erro
  // real, pra não gastar cota gravando sessões saudáveis.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  integrations: dsn ? [Sentry.replayIntegration()] : [],
})
