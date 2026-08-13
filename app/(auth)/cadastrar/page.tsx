import Link from 'next/link'
import { FormularioCadastrar } from '@/components/auth/formulario-cadastrar'

export default function PaginaCadastrar({
  searchParams,
}: {
  searchParams: { papel?: string; convite?: string }
}) {
  const papelInicial = searchParams.papel === 'profissional' ? 'profissional' : 'morador'

  return (
    <div className="rounded-casca border border-barro-100 bg-white p-8 shadow-feira-lg">
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
        <FormularioCadastrar papelInicial={papelInicial} codigoConvite={searchParams.convite} />
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
