'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSessao } from '@/components/layout/sessao'

/** Sino → central de notificações, com bolinha quando há não lidas. */
export function BotaoSino({ sobreVerde = false, className }: { sobreVerde?: boolean; className?: string }) {
  const { logado, naoLidas } = useSessao()
  const rotulo = naoLidas > 0 ? `Notificações, ${naoLidas} ${naoLidas === 1 ? 'nova' : 'novas'}` : 'Notificações'
  return (
    <Link
      href={logado ? '/notificacoes' : '/entrar?next=/notificacoes'}
      aria-label={rotulo}
      className={cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-colors',
        sobreVerde ? 'bg-white/[0.12] text-white hover:bg-white/20' : 'border border-barro-200/80 bg-superficie text-barro-900 hover:bg-barro-50',
        className
      )}
    >
      <Bell className="h-[22px] w-[22px]" strokeWidth={2} />
      {naoLidas > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-2.5 top-2 h-[9px] w-[9px] rounded-full border-2 bg-laranja',
            sobreVerde ? 'border-serra' : 'border-superficie'
          )}
        />
      )}
    </Link>
  )
}
