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

  // Import dinâmico e dentro do try/catch de propósito: um import estático no
  // topo do arquivo falha na resolução do módulo (Edge Runtime) ANTES de
  // qualquer código nosso rodar, o que não é capturável por try/catch nenhum
  // e derruba toda a rota. Um import() dinâmico rejeita a Promise em vez de
  // quebrar o carregamento do middleware, então conseguimos degradar sem
  // crashar o site inteiro caso essa dependência tenha algum problema de
  // compatibilidade com Edge Runtime.
  try {
    const { createServerClient } = await import('@supabase/ssr')

    const supabase = createServerClient(SUPA_URL, SUPA_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: request.headers } })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })

    // Atualiza a sessão se o token tiver expirado — necessário para Server Components
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
