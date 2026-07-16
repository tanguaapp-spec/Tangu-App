import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Verifica variáveis de ambiente do Supabase para evitar erro de startup
  const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!SUPA_URL || !SUPA_KEY) {
    console.error(
      'Supabase environment variables missing. Create a .env.local based on .env.example with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
    return response
  }

  const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  // Atualiza a sessão se o token tiver expirado — necessário para Server Components
  try {
    await supabase.auth.getUser()
  } catch (err) {
    console.error('Erro ao atualizar sessão Supabase no middleware:', err)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
