import { cn } from '@/lib/utils'
import { BadgeCheck } from 'lucide-react'
import { ReactNode } from 'react'

export function Selo({
  children,
  tom = 'neutro',
  className,
}: {
  children: ReactNode
  tom?: 'neutro' | 'laranja' | 'verde' | 'aviso'
  className?: string
}) {
  const tons = {
    neutro: 'bg-barro-100 text-barro-700',
    laranja: 'bg-casca-100 text-casca-700',
    verde: 'bg-mata-100 text-mata-700',
    aviso: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        tons[tom],
        className
      )}
    >
      {children}
    </span>
  )
}

export function SeloVerificado() {
  return (
    <Selo tom="verde">
      <BadgeCheck className="h-3.5 w-3.5" />
      Verificado
    </Selo>
  )
}
