import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FormularioRedefinirSenha } from '@/components/auth/formulario-redefinir-senha'

export const metadata: Metadata = { title: 'Nova senha', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaRedefinirSenha() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Criar nova senha</h1>
      {user ? (
        <>
          <p className="mt-1 text-sm text-barro-600">Escolha uma senha com pelo menos 8 caracteres.</p>
          <div className="mt-6">
            <FormularioRedefinirSenha />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-barro-700">
          Esse link expirou ou já foi usado.{' '}
          <Link href="/esqueci-senha" className="font-semibold text-casca-600 hover:underline">
            Peça um novo link
          </Link>
          .
        </p>
      )}
    </div>
  )
}
