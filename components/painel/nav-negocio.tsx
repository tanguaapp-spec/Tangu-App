'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CreditCard,
  Eye,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Package,
  QrCode,
  Star,
  Store,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoTangua } from '@/components/marca/logo-tangua'
import { SeletorTema } from '@/components/tema/seletor-tema'

type Item = { href: string; rotulo: string; icone: LucideIcon; badge?: 'orcamentos'; exato?: boolean }

// Barra inferior do celular (protótipo "Painel — mobile")
const INFERIOR: Item[] = [
  { href: '/painel/negocio', rotulo: 'Painel', icone: LayoutDashboard, exato: true },
  { href: '/painel/negocio/catalogo', rotulo: 'Catálogo', icone: Package },
  { href: '/painel/negocio/ofertas', rotulo: 'Ofertas', icone: Tag },
  { href: '/painel/negocio/orcamentos', rotulo: 'Orçamentos', icone: Inbox, badge: 'orcamentos' },
  { href: '/painel/negocio/mais', rotulo: 'Mais', icone: MoreHorizontal },
]

// Menu lateral do computador (protótipo "Painel — desktop")
const LATERAL: Item[] = [
  { href: '/painel/negocio', rotulo: 'Painel', icone: LayoutDashboard, exato: true },
  { href: '/painel/negocio/perfil', rotulo: 'Perfil do negócio', icone: Store },
  { href: '/painel/negocio/catalogo', rotulo: 'Catálogo', icone: Package },
  { href: '/painel/negocio/ofertas', rotulo: 'Ofertas e cupons', icone: Tag },
  { href: '/painel/negocio/novidades', rotulo: 'Novidades', icone: Megaphone },
  { href: '/painel/negocio/orcamentos', rotulo: 'Orçamentos', icone: Inbox, badge: 'orcamentos' },
  { href: '/painel/negocio/avaliacoes', rotulo: 'Avaliações', icone: Star },
  { href: '/painel/negocio/estatisticas', rotulo: 'Estatísticas', icone: BarChart3 },
  { href: '/painel/negocio/divulgar', rotulo: 'Divulgar (QR e link)', icone: QrCode },
  { href: '/painel/negocio/equipe', rotulo: 'Equipe', icone: Users },
  { href: '/painel/negocio/assinatura', rotulo: 'Plano e assinatura', icone: CreditCard },
  { href: '/ajuda', rotulo: 'Ajuda e suporte', icone: LifeBuoy },
]

function ativoEm(pathname: string, item: Item) {
  return item.exato ? pathname === item.href : pathname.startsWith(item.href)
}

export function NavNegocio({
  pendentes,
  urlPublica,
  acaoSair,
  temNegocio,
}: {
  pendentes: number
  urlPublica: string | null
  acaoSair: () => void
  temNegocio: boolean
}) {
  const pathname = usePathname()
  // "Mais" acende nas telas que só existem dentro dele
  const noMais = !INFERIOR.slice(0, 4).some((i) => ativoEm(pathname, i))

  return (
    <>
      <aside
        aria-label="Menu do painel"
        className="sticky top-0 hidden h-screen w-[248px] print:!hidden shrink-0 flex-col gap-[18px] overflow-y-auto bg-serra-escuro px-4 py-[22px] text-[#E3F0E8] md:flex"
      >
        <Link href="/" className="flex items-center gap-2 px-2 text-white">
          <LogoTangua variante="sobre-escuro" className="h-8 w-8" />
          <span className="font-display text-[22px] font-bold">tanguá</span>
          <span className="rounded-full border border-[#2E5C4C] px-2 py-0.5 text-[11px] font-bold text-[#A9D9BC]">negócios</span>
        </Link>
        {temNegocio && (
          <nav aria-label="Seções" className="flex flex-col gap-0.5 text-[15px] font-semibold">
            {LATERAL.map((item) => {
              const ativo = ativoEm(pathname, item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'flex h-11 items-center gap-2.5 rounded-xl px-3',
                    ativo ? 'bg-[#E3F0E8] text-[#0E4D3A]' : 'text-[#E3F0E8] hover:bg-white/[0.08]'
                  )}
                >
                  <item.icone className="h-[18px] w-[18px]" aria-hidden="true" />
                  {item.rotulo}
                  {item.badge && pendentes > 0 && (
                    <span className="ml-auto flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-laranja px-1.5 font-mono text-xs font-bold text-tinta">
                      {pendentes}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        )}
        <div className="mt-auto flex flex-col gap-3 px-1">
          {urlPublica && (
            <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 text-sm font-semibold text-[#A9D9BC] hover:text-white">
              <Eye className="h-4 w-4" aria-hidden="true" /> Ver como o cliente vê
            </a>
          )}
          <div className="rounded-xl bg-white/[0.06] p-2 [&_*]:!text-[#E3F0E8]">
            <SeletorTema />
          </div>
          <form action={acaoSair}>
            <button className="flex items-center gap-2 px-2 text-sm text-[#A9D9BC] hover:text-white">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
            </button>
          </form>
        </div>
      </aside>

      {temNegocio && (
        <nav
          aria-label="Navegação do painel"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-barro-200/80 bg-superficie pb-[max(8px,env(safe-area-inset-bottom))] md:hidden print:hidden"
        >
          {INFERIOR.map((item) => {
            const ativo = item.href === '/painel/negocio/mais' ? noMais : ativoEm(pathname, item)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? 'page' : undefined}
                className={cn('flex h-[68px] flex-col items-center justify-center gap-[3px] text-[11px]', ativo ? 'font-bold text-mata-700' : 'font-semibold text-barro-600')}
              >
                <span className={cn('relative flex h-[30px] items-center justify-center rounded-full', ativo ? 'w-[52px] bg-mata-100' : 'w-[30px]')}>
                  <item.icone className="h-[22px] w-[22px]" aria-hidden="true" />
                  {item.badge && pendentes > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-laranja px-1 font-mono text-[10px] font-bold text-tinta">
                      {pendentes}
                    </span>
                  )}
                </span>
                {item.rotulo}
              </Link>
            )
          })}
        </nav>
      )}
    </>
  )
}
