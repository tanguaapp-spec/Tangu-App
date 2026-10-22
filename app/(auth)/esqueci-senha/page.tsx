import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioEsqueciSenha } from '@/components/auth/formulario-esqueci-senha'

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false } }

export default function PaginaEsqueciSenha() {
  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-barro-600">
        Digite o e-mail da conta. A gente manda um link pra você criar uma senha nova.
      </p>
      <div className="mt-6">
        <FormularioEsqueciSenha />
      </div>
      <p className="mt-6 text-center text-sm text-barro-600">
        Lembrou?{' '}
        <Link href="/entrar" className="font-semibold text-casca-600 hover:underline">
          Voltar pra entrar
        </Link>
      </p>
    </div>
  )
}
