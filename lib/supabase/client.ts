import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Don't throw during build time
  if (!SUPA_URL || !SUPA_KEY) {
    console.warn('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Supabase client will not work properly.')
    return createBrowserClient('https://dummy-url.supabase.co', 'dummy-key')
  }

  return createBrowserClient(SUPA_URL, SUPA_KEY)
}
