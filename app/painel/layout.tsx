import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { sair } from '@/lib/actions/auth-actions'
import { LayoutDashboard, Store, Briefcase, Megaphone, ShieldCheck, LogOut } from 'lucide-react'

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()

  const linksProfissional = [
    { href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store },
  ]
  const linksAdmin = [
    { href: '/painel/admin', rotulo: 'Visão geral', icone: LayoutDashboard },
    { href: '/painel/admin/reivindicacoes', rotulo: 'Reivindicações', icone: ShieldCheck },
    { href: '/painel/admin/vagas', rotulo: 'Vagas', icone: Briefcase },
    { href: '/painel/admin/avisos', rotulo: 'Avisos da cidade', icone: Megaphone },
  ]

  const links = perfil?.papel === 'admin' ? linksAdmin : linksProfissional

  return (
    <div className="flex min-h-screen bg-feira">
      <aside className="hidden w-64 shrink-0 border-r border-barro-100 bg-white p-5 sm:block">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-casca-500 text-white font-display font-bold">
            T
          </span>
          <span className="font-display text-lg font-semibold text-barro-900">Painel</span>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-barro-700 hover:bg-barro-100"
            >
              <link.icone className="h-4 w-4" />
              {link.rotulo}
            </Link>
          ))}
        </nav>

        <form action={sair} className="absolute bottom-5 left-5">
          <button className="flex items-center gap-2 text-sm text-barro-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </aside>

      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  )
}
