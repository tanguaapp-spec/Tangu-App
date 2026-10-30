import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FormularioEntrar } from '@/components/auth/formulario-entrar'
import { createClient } from '@/lib/supabase/server'
import { caminhoInternoSeguro } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function PaginaEntrar({ searchParams }: { searchParams: { erro?: string; next?: string } }) {
  // já logado: vai direto pra onde queria ir
  const {
    data: { user },
  } = await createClient().auth.getUser()
  if (user) redirect(caminhoInternoSeguro(searchParams.next, '/'))

  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Entrar</h1>
      <p className="mt-1 text-sm text-barro-600">Acesse sua conta para favoritar, avaliar e gerenciar seu negócio.</p>

      {searchParams.erro === 'link-invalido' && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Esse link expirou ou já foi usado. Entre com sua senha ou peça um novo link.
        </p>
      )}

      <div className="mt-6">
        <FormularioEntrar proximo={searchParams.next} />
      </div>

      <p className="mt-4 text-center text-sm">
        <Link href="/esqueci-senha" className="font-medium text-barro-600 hover:text-casca-600 hover:underline">
          Esqueci minha senha
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-barro-600">
        Ainda não tem conta?{' '}
        <Link href="/cadastrar" className="font-semibold text-casca-600 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
