'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, FileText, Home, Tag, User, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { vibrar } from '@/lib/ui/vibrar'
import { useTecladoAberto } from '@/components/layout/use-teclado-aberto'

// Barra fixa do celular (no computador a navegação fica no cabeçalho).
// "Você" funciona sem conta: mostra entrar/cadastrar e as preferências.
const ITENS: { href: string; rotulo: string; icone: LucideIcon; tambem?: string[] }[] = [
  { href: '/', rotulo: 'Início', icone: Home },
  { href: '/buscar', rotulo: 'Explorar', icone: Compass, tambem: ['/categoria', '/negocio'] },
  { href: '/ofertas', rotulo: 'Ofertas', icone: Tag },
  { href: '/orcamentos', rotulo: 'Orçamentos', icone: FileText },
  { href: '/perfil', rotulo: 'Você', icone: User, tambem: ['/favoritos', '/notificacoes', '/entrar', '/cadastrar'] },
]

/**
 * Sempre presente em todas as telas públicas (inclusive o perfil do negócio,
 * onde a barra de WhatsApp fica logo acima dela). Só sai de cena enquanto o
 * teclado está aberto, igual app nativo.
 */
export function NavInferior() {
  const pathname = usePathname()
  const teclado = useTecladoAberto()
  return (
    <nav
      aria-label="Navegação principal"
      className={cn(
        'barra-fixa fixed inset-x-0 bottom-0 z-40 grid h-[var(--altura-nav)] grid-cols-5 border-t border-barro-200/80 bg-superficie pb-[var(--respiro-nav)] transition-transform duration-200 md:hidden',
        teclado && 'translate-y-full'
      )}
    >
      {ITENS.map((item) => {
        const ativo =
          item.href === '/' ? pathname === '/' : [item.href, ...(item.tambem ?? [])].some((p) => pathname.startsWith(p))
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? 'page' : undefined}
            onClick={() => !ativo && vibrar(8)}
            className={cn(
              'flex flex-col items-center justify-center gap-[3px] text-[11px]',
              ativo ? 'font-bold text-mata-700' : 'font-semibold text-barro-600'
            )}
          >
            <span
              className={cn(
                'flex h-[30px] items-center justify-center rounded-full transition-all duration-200',
                ativo ? 'w-[52px] bg-mata-100' : 'w-[30px]'
              )}
            >
              <item.icone className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
            {item.rotulo}
          </Link>
        )
      })}
    </nav>
  )
}
