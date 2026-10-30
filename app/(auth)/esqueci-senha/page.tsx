import type { Metadata } from 'next'
import Link from 'next/link'
import { FormularioEsqueciSenha } from '@/components/auth/formulario-esqueci-senha'
import { PedirAcessoWhatsapp } from '@/components/auth/pedir-acesso-whatsapp'

export const metadata: Metadata = { title: 'Recuperar senha', robots: { index: false } }

export default function PaginaEsqueciSenha({ searchParams }: { searchParams: { link?: string } }) {
  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <h1 className="font-display text-2xl font-semibold text-barro-900">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-barro-600">
        Digite o e-mail da conta. A gente manda um link pra você criar uma senha nova.
      </p>
      {searchParams.link === 'invalido' && (
        <p role="alert" className="mt-4 rounded-xl bg-casca-50 p-3 text-sm text-casca-900">
          Esse link expirou ou já foi usado. Peça um novo abaixo.
        </p>
      )}
      <div className="mt-6">
        <FormularioEsqueciSenha />
      </div>
      <div className="mt-4">
        <PedirAcessoWhatsapp />
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
