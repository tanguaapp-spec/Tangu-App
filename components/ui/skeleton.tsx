import { cn } from '@/lib/utils'

/** Bloco cinza pulsante — peça básica das telas de carregamento (loading.tsx). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-barro-100', className)} />
}
