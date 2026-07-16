import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Don't throw during prerendering - just return a dummy client (or handle later)
  // This allows the build to complete even if env vars aren't set yet
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase client will not work properly.')
    // Return a dummy client for build time (will fail at runtime if env vars are still missing)
    return createServerClient('https://dummy-url.supabase.co', 'dummy-key', {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {}
      }
    })
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
