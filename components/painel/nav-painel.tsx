'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Store,
  ShieldCheck,
  Briefcase,
  Megaphone,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoTangua } from '@/components/marca/logo-tangua'
import type { PapelUsuario } from '@/lib/types/database'

type LinkPainel = { href: string; rotulo: string; icone: LucideIcon }

// Definidos aqui dentro (componente client) de propósito: os ícones do
// lucide-react são componentes (forwardRef), e um Server Component não
// pode passar componentes como prop pra um Client Component — só dados
// serializáveis. Por isso o layout (server) manda só o `papel`, uma
// string, e a gente decide a lista aqui.
const LINKS_PROFISSIONAL: LinkPainel[] = [{ href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store }]
const LINKS_ADMIN: LinkPainel[] = [
  { href: '/painel/admin', rotulo: 'Visão geral', icone: LayoutDashboard },
  { href: '/painel/admin/negocios-pendentes', rotulo: 'Cadastros pendentes', icone: Store },
  { href: '/painel/admin/reivindicacoes', rotulo: 'Reivindicações', icone: ShieldCheck },
  { href: '/painel/admin/vagas', rotulo: 'Vagas', icone: Briefcase },
  { href: '/painel/admin/avisos', rotulo: 'Avisos da cidade', icone: Megaphone },
]

export function NavPainel({
  papel,
  acaoSair,
}: {
  papel: PapelUsuario | null | undefined
  acaoSair: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const pathname = usePathname()
  const links = papel === 'admin' ? LINKS_ADMIN : LINKS_PROFISSIONAL

  const itemNav = (link: LinkPainel, aoClicar?: () => void) => {
    const ativo = pathname === link.href
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={aoClicar}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          ativo ? 'bg-casca-100 text-casca-700' : 'text-barro-700 hover:bg-barro-100'
        )}
      >
        <link.icone className="h-4 w-4" />
        {link.rotulo}
      </Link>
    )
  }

  return (
    <>
      {/* barra mobile — some no desktop */}
      <header className="flex items-center justify-between border-b border-barro-100 bg-white px-4 py-3 sm:hidden">
        <Link href="/" className="flex items-center gap-2">
          <LogoTangua className="h-8 w-8" />
          <span className="font-display text-lg font-semibold text-barro-900">Painel</span>
        </Link>
        <button
          aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setAberto(!aberto)}
          className="rounded-lg p-2 text-barro-800 hover:bg-barro-100"
        >
          {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* menu mobile — slide-down */}
      {aberto && (
        <nav className="flex flex-col gap-1 border-b border-barro-100 bg-white px-4 py-3 sm:hidden">
          {links.map((link) => itemNav(link, () => setAberto(false)))}
          <form action={acaoSair}>
            <button className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-barro-500 hover:bg-barro-100 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </nav>
      )}

      {/* barra lateral — só no desktop */}
      <aside className="relative hidden w-64 shrink-0 border-r border-barro-100 bg-white p-5 sm:block">
        <Link href="/" className="flex items-center gap-2">
          <LogoTangua className="h-8 w-8" />
          <span className="font-display text-lg font-semibold text-barro-900">Painel</span>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">{links.map((link) => itemNav(link))}</nav>

        <form action={acaoSair} className="absolute bottom-5 left-5">
          <button className="flex items-center gap-2 text-sm text-barro-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </aside>
    </>
  )
}
