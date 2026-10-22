import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { caminhoInternoSeguro } from '@/lib/site'

export const dynamic = 'force-dynamic'

/**
 * Destino dos links de e-mail do Supabase Auth (confirmação de cadastro,
 * redefinição de senha, troca de e-mail) no fluxo PKCE: troca o `code` por
 * uma sessão e segue pro `next` (só caminhos internos).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const destino = caminhoInternoSeguro(url.searchParams.get('next'), '/')

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(destino, url.origin))
  }

  return NextResponse.redirect(new URL('/entrar?erro=link-invalido', url.origin))
}
