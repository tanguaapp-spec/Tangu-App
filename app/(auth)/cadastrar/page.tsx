import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FormularioCadastrar } from '@/components/auth/formulario-cadastrar'
import { createClient } from '@/lib/supabase/server'
import { caminhoInternoSeguro } from '@/lib/site'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'

export const dynamic = 'force-dynamic'

export default async function PaginaCadastrar({
  searchParams,
}: {
  searchParams: { papel?: string; convite?: string; origem?: string; next?: string }
}) {
  const papelInicial = searchParams.papel === 'profissional' ? 'profissional' : 'morador'

  // quem já está logado não precisa criar conta: segue pro destino
  // (lojista vai pro painel, que oferece cadastrar o negócio se ainda não tiver)
  const {
    data: { user },
  } = await createClient().auth.getUser()
  if (user) {
    let destino = caminhoInternoSeguro(searchParams.next, papelInicial === 'profissional' ? '/painel/negocio' : '/')
    // sem negócio ainda, as telas internas do painel mandariam de volta pro painel: vai direto
    if (destino.startsWith('/painel/negocio/') && !(await negocioDoPainel()).negocio) destino = '/painel/negocio'
    redirect(destino)
  }

  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Criar conta</h1>
      <p className="mt-1 text-sm text-barro-600">
        {papelInicial === 'profissional'
          ? 'Cadastre-se para gerenciar seu negócio no Tanguá App.'
          : 'Cadastre-se para favoritar negócios e deixar avaliações.'}
      </p>
      {searchParams.convite && (
        <p className="mt-2 rounded-lg bg-mata-50 px-3 py-2 text-sm text-mata-700">
          Você foi indicado por um vizinho — seja bem-vindo(a)!
        </p>
      )}

      <div className="mt-6">
        <FormularioCadastrar
          papelInicial={papelInicial}
          codigoConvite={searchParams.convite}
          origem={searchParams.origem ?? (searchParams.convite ? 'convite' : undefined)}
        />
      </div>

      <p className="mt-6 text-center text-sm text-barro-600">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-semibold text-casca-600 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
