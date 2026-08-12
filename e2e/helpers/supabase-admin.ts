import { createClient } from '@supabase/supabase-js'

// Cliente com service role — só usado pelos testes E2E (Node, nunca no browser),
// pra criar/confirmar usuários de teste sem depender de caixa de entrada real.
export function clienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !chave) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar no .env pra rodar os testes E2E.'
    )
  }
  return createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } })
}

// Domínio que nunca recebe e-mail de verdade — os usuários já nascem confirmados
// via Admin API, então não precisa ser um domínio real.
export const DOMINIO_TESTE = 'tangua-app-teste.dev'
