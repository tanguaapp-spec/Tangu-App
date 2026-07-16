import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPA_URL || !SUPA_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for server client. See .env.example.'
    )
  }

  return createServerClient(SUPA_URL, SUPA_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // chamado de um Server Component — ignorado pois o middleware atualiza a sessão
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // idem acima
        }
      },
    },
  })
}

// Cliente com privilégios de serviço — uso restrito a route handlers/scripts
// administrativos (ex: importação do Google Places). NUNCA expor ao browser.
export function createServiceClient() {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!SUPA_URL || !SERVICE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL for service client.')
  }

  return createSupabaseClient(SUPA_URL, SERVICE_KEY, { auth: { persistSession: false } })
}
