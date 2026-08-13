'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Megaphone, Briefcase, User } from 'lucide-react'
import { cn } from '@/lib/utils'

// Barra de navegação fixa embaixo — o padrão que faz um PWA parecer app de
// verdade (Instagram, iFood, 99), não site responsivo. Só mobile: no desktop
// a navegação já vive no cabeçalho. "/perfil" resolve sozinho pra /entrar
// quando não há sessão (redirect no próprio Server Component da página),
// então não precisa checar login aqui.
const ITENS = [
  { href: '/', rotulo: 'Início', icone: Home },
  { href: '/buscar', rotulo: 'Buscar', icone: Search },
  { href: '/mural', rotulo: 'Mural', icone: Megaphone },
  { href: '/vagas', rotulo: 'Vagas', icone: Briefcase },
  { href: '/perfil', rotulo: 'Perfil', icone: User },
]

export function NavInferior() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-black/10 bg-barro-900 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 md:hidden"
      aria-label="Navegação principal"
    >
      {ITENS.map((item) => {
        const ativo = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-w-[56px] flex-col items-center gap-1 py-1"
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                ativo ? 'bg-casca-500 text-white shadow-[0_0_0_6px_rgba(239,122,26,0.18)]' : 'text-barro-400'
              )}
            >
              <item.icone className="h-[18px] w-[18px]" strokeWidth={ativo ? 2.4 : 2} />
            </span>
            <span className={cn('text-[10px] font-semibold', ativo ? 'text-white' : 'text-barro-400')}>
              {item.rotulo}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
