import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPA_URL || !SUPA_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Create a .env.local based on .env.example.'
    )
  }

  return createBrowserClient(SUPA_URL, SUPA_KEY)
}
