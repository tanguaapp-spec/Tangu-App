import type { Metadata } from 'next'
import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { confirmarLinkAcesso } from '@/lib/actions/acesso-actions'

export const metadata: Metadata = { title: 'Criar nova senha', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Destino do link mandado pelo WhatsApp. Só abrir não gasta o link (a
 * prévia do WhatsApp também abre); ele é usado ao tocar no botão.
 */
export default function PaginaAcesso({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token ?? ''
  return (
    <div className="rounded-casca border border-barro-100 bg-superficie p-8 shadow-feira-lg">
      <KeyRound className="h-8 w-8 text-mata-700" aria-hidden="true" />
      <h1 className="mt-3 font-display text-2xl font-semibold text-barro-900">Entrar na sua conta</h1>
      {token ? (
        <>
          <p className="mt-1 text-sm text-barro-600">
            Toque no botão para criar uma senha nova. O link vale por 1 hora e só funciona uma vez.
          </p>
          <form action={confirmarLinkAcesso} className="mt-6">
            <input type="hidden" name="token" value={token} />
            <Botao type="submit" className="w-full">
              Criar nova senha
            </Botao>
          </form>
        </>
      ) : (
        <p className="mt-3 text-sm text-barro-700">
          Link incompleto. Abra de novo pela mensagem do WhatsApp ou{' '}
          <Link href="/esqueci-senha" className="font-semibold text-casca-600 hover:underline">
            peça um novo
          </Link>
          .
        </p>
      )}
    </div>
  )
}
