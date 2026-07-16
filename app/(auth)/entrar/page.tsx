import Link from 'next/link'
import { FormularioEntrar } from '@/components/auth/formulario-entrar'

export default function PaginaEntrar() {
  return (
    <div className="rounded-casca border border-barro-100 bg-white p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Entrar</h1>
      <p className="mt-1 text-sm text-barro-600">Acesse sua conta para favoritar, avaliar e gerenciar seu negócio.</p>

      <div className="mt-6">
        <FormularioEntrar />
      </div>

      <p className="mt-6 text-center text-sm text-barro-600">
        Ainda não tem conta?{' '}
        <Link href="/cadastrar" className="font-semibold text-casca-600 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
