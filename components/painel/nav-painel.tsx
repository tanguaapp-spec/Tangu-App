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
  AlertTriangle,
  Flag,
  Sparkles,
  Radar,
  CreditCard,
  Inbox,
  LifeBuoy,
  Settings,
  ScrollText,
  Layers,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarcaTangua } from '@/components/marca/logo-tangua'
import { SeletorTema } from '@/components/tema/seletor-tema'
import type { PapelUsuario } from '@/lib/types/database'

type LinkPainel = { href: string; rotulo: string; icone: LucideIcon }

// Definidos aqui dentro (componente client) de propósito: os ícones do
// lucide-react são componentes (forwardRef), e um Server Component não
// pode passar componentes como prop pra um Client Component — só dados
// serializáveis. Por isso o layout (server) manda só o `papel`, uma
// string, e a gente decide a lista aqui.
const LINKS_PROFISSIONAL: LinkPainel[] = [
  { href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store },
  { href: '/painel/negocio/orcamentos', rotulo: 'Pedidos de orçamento', icone: Inbox },
  { href: '/painel/negocio/assinatura', rotulo: 'Plano e assinatura', icone: CreditCard },
  { href: '/ajuda', rotulo: 'Ajuda e suporte', icone: LifeBuoy },
]
const LINKS_ADMIN: LinkPainel[] = [
  { href: '/painel/admin', rotulo: 'Visão geral', icone: LayoutDashboard },
  { href: '/painel/admin/negocios-pendentes', rotulo: 'Cadastros sinalizados', icone: Store },
  { href: '/painel/admin/negocios', rotulo: 'Negócios', icone: Sparkles },
  { href: '/painel/admin/reivindicacoes', rotulo: 'Reivindicações', icone: ShieldCheck },
  { href: '/painel/admin/denuncias', rotulo: 'Denúncias', icone: Flag },
  { href: '/painel/admin/vagas', rotulo: 'Vagas', icone: Briefcase },
  { href: '/painel/admin/avisos', rotulo: 'Avisos da cidade', icone: Megaphone },
  { href: '/painel/admin/prospeccao', rotulo: 'Prospecção (Google Maps)', icone: Radar },
  { href: '/painel/admin/logs', rotulo: 'Logs de erro', icone: AlertTriangle },
  { href: '/painel/admin/suporte', rotulo: 'Chamados de suporte', icone: LifeBuoy },
  { href: '/painel/admin/assinaturas', rotulo: 'Assinaturas e pagamentos', icone: CreditCard },
  { href: '/painel/admin/planos', rotulo: 'Planos e limites', icone: Layers },
  { href: '/painel/admin/configuracoes', rotulo: 'Configurações', icone: Settings },
  { href: '/painel/admin/auditoria', rotulo: 'Auditoria', icone: ScrollText },
  { href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store },
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
      <header className="flex items-center justify-between border-b border-barro-100 bg-superficie px-4 py-3 sm:hidden">
        <Link href="/" className="flex items-center gap-2">
          <MarcaTangua tamanho="sm" className="text-mata-700" />
          <span className="rounded-full border border-barro-200 px-2 py-0.5 text-xs font-semibold text-barro-600">painel</span>
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
        <nav className="flex flex-col gap-1 border-b border-barro-100 bg-superficie px-4 py-3 sm:hidden">
          {links.map((link) => itemNav(link, () => setAberto(false)))}
          <div className="py-2">
            <SeletorTema />
          </div>
          <form action={acaoSair}>
            <button className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-barro-500 hover:bg-barro-100 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </nav>
      )}

      {/* barra lateral — só no desktop */}
      <aside className="relative hidden w-64 shrink-0 border-r border-barro-100 bg-superficie p-5 sm:block">
        <Link href="/" className="flex items-center gap-2">
          <MarcaTangua tamanho="sm" className="text-mata-700" />
          <span className="rounded-full border border-barro-200 px-2 py-0.5 text-xs font-semibold text-barro-600">painel</span>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">{links.map((link) => itemNav(link))}</nav>

        <div className="mt-6">
          <SeletorTema />
        </div>

        <form action={acaoSair} className="absolute bottom-5 left-5">
          <button className="flex items-center gap-2 text-sm text-barro-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </aside>
    </>
  )
}
