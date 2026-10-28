import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut, Target, TrendingUp } from 'lucide-react'
import { verificarCrescimento } from '@/lib/auth/require-admin'
import { sair } from '@/lib/actions/auth-actions'
import { MarcaTangua } from '@/components/marca/logo-tangua'

export const dynamic = 'force-dynamic'

// Área da equipe de crescimento: só métricas e leads (guarda no servidor pra todas as páginas daqui)
export default async function LayoutCrescimento({ children }: { children: React.ReactNode }) {
  const r = await verificarCrescimento()
  if ('erro' in r) redirect('/entrar?next=/painel/crescimento')
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-2 border-b border-barro-100 bg-superficie px-4 py-2">
        <Link href="/" className="mr-2 flex min-h-11 items-center text-mata-700">
          <MarcaTangua tamanho="sm" />
        </Link>
        <Link href="/painel/crescimento" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-barro-800 hover:bg-barro-100">
          <TrendingUp className="h-4 w-4" aria-hidden="true" /> Crescimento
        </Link>
        <Link href="/painel/crescimento/leads" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-barro-800 hover:bg-barro-100">
          <Target className="h-4 w-4" aria-hidden="true" /> Leads
        </Link>
        <form action={sair} className="ml-auto">
          <button className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm text-barro-600">
            <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
          </button>
        </form>
      </header>
      <main className="p-5 sm:p-10">{children}</main>
    </div>
  )
}
