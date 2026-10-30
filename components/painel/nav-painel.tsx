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
  Users,
  Tags,
  Send,
  TrendingUp,
  Target,
  Rocket,
  Upload,
  Newspaper,
  ToggleRight,
  BookOpen,
  Gift,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarcaTangua } from '@/components/marca/logo-tangua'
import { SeletorTema } from '@/components/tema/seletor-tema'
import type { PapelUsuario } from '@/lib/types/database'

type LinkPainel = { href: string; rotulo: string; icone: LucideIcon; contador?: 'erros' }

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
  { href: '/painel/admin/como-funciona', rotulo: 'Como o app funciona', icone: BookOpen },
  { href: '/painel/admin/crescimento', rotulo: 'Crescimento (métricas)', icone: TrendingUp },
  { href: '/painel/admin/leads', rotulo: 'Leads (quem contatar)', icone: Target },
  { href: '/painel/admin/engajamento', rotulo: 'Engajamento e prêmios', icone: Gift },
  { href: '/painel/admin/divulgacao', rotulo: 'Divulgação paga', icone: Rocket },
  { href: '/painel/admin/importar', rotulo: 'Importar comércios', icone: Upload },
  { href: '/painel/admin/conteudo', rotulo: 'Notícias, eventos e serviços', icone: Newspaper },
  { href: '/painel/admin/recursos', rotulo: 'Recursos do app', icone: ToggleRight },
  { href: '/painel/admin/logs', rotulo: 'Logs de erro', icone: AlertTriangle, contador: 'erros' },
  { href: '/painel/admin/negocios-pendentes', rotulo: 'Cadastros sinalizados', icone: Store },
  { href: '/painel/admin/negocios', rotulo: 'Negócios (destaque e verificação)', icone: Sparkles },
  { href: '/painel/admin/usuarios', rotulo: 'Usuários', icone: Users },
  { href: '/painel/admin/categorias', rotulo: 'Categorias', icone: Tags },
  { href: '/painel/admin/comunicados', rotulo: 'Comunicados', icone: Send },
  { href: '/painel/admin/reivindicacoes', rotulo: 'Reivindicações', icone: ShieldCheck },
  { href: '/painel/admin/denuncias', rotulo: 'Denúncias', icone: Flag },
  { href: '/painel/admin/vagas', rotulo: 'Vagas', icone: Briefcase },
  { href: '/painel/admin/avisos', rotulo: 'Avisos da cidade', icone: Megaphone },
  { href: '/painel/admin/prospeccao', rotulo: 'Prospecção (Google Maps)', icone: Radar },
  { href: '/painel/admin/suporte', rotulo: 'Chamados de suporte', icone: LifeBuoy },
  { href: '/painel/admin/assinaturas', rotulo: 'Assinaturas e pagamentos', icone: CreditCard },
  { href: '/painel/admin/planos', rotulo: 'Planos e recursos', icone: Layers },
  { href: '/painel/admin/configuracoes', rotulo: 'Configurações', icone: Settings },
  { href: '/painel/admin/auditoria', rotulo: 'Auditoria', icone: ScrollText },
  { href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store },
]

export function NavPainel({
  papel,
  acaoSair,
  errosAbertos = 0,
}: {
  papel: PapelUsuario | null | undefined
  acaoSair: () => void
  /** erros sem resolver — aparece como bolinha vermelha no item Logs */
  errosAbertos?: number
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
        {link.contador === 'erros' && errosAbertos > 0 && (
          <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1.5 font-mono text-xs font-bold text-white" aria-label={`${errosAbertos} erros abertos`}>
            {errosAbertos > 99 ? '99+' : errosAbertos}
          </span>
        )}
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
        <div className="flex items-center gap-1">
          {papel === 'admin' && (
            <Link
              href="/painel/admin/logs"
              aria-label={errosAbertos > 0 ? `Logs de erro, ${errosAbertos} abertos` : 'Logs de erro'}
              className={cn(
                'flex h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold',
                errosAbertos > 0 ? 'bg-red-50 text-red-700' : 'text-barro-800 hover:bg-barro-100'
              )}
            >
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              Logs
              {errosAbertos > 0 && <span className="font-mono text-xs font-bold">{errosAbertos > 99 ? '99+' : errosAbertos}</span>}
            </Link>
          )}
          <button
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setAberto(!aberto)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-barro-800 hover:bg-barro-100"
          >
            {aberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
      {/* barra lateral rola sozinha e "Sair" fica no fim, sem cobrir os itens */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-barro-100 bg-superficie p-5 sm:flex">
        <Link href="/" className="flex items-center gap-2">
          <MarcaTangua tamanho="sm" className="text-mata-700" />
          <span className="rounded-full border border-barro-200 px-2 py-0.5 text-xs font-semibold text-barro-600">painel</span>
        </Link>

        <nav className="mt-8 flex flex-col gap-1">{links.map((link) => itemNav(link))}</nav>

        <div className="mt-6">
          <SeletorTema />
        </div>

        <form action={acaoSair} className="mt-auto pt-6">
          <button className="flex items-center gap-2 text-sm text-barro-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </form>
      </aside>
    </>
  )
}
