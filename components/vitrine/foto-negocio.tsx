import Image from 'next/image'
import { iconeCategoria } from '@/lib/ui/icone-categoria'
import { cn } from '@/lib/utils'

// Sem foto: um tom suave com o ícone da categoria (nunca foto inventada).
const TONS = ['bg-mata-100 text-mata-700', 'bg-casca-100 text-casca-800', 'bg-barro-100 text-barro-700', 'bg-yellow-100 text-yellow-800']

function tomPorId(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONS[h % TONS.length]
}

export function FotoNegocio({
  id,
  url,
  nome,
  icone,
  className,
  tamanhos = '(max-width: 768px) 50vw, 25vw',
  prioridade = false,
}: {
  id: string
  url: string | null | undefined
  nome: string
  icone?: string | null
  className?: string
  tamanhos?: string
  prioridade?: boolean
}) {
  if (url) {
    return (
      <span className={cn('relative block overflow-hidden', className)}>
        <Image src={url} alt={`Foto de ${nome}`} fill sizes={tamanhos} priority={prioridade} className="object-cover" />
      </span>
    )
  }
  const Icone = iconeCategoria(icone)
  return (
    <span aria-hidden="true" className={cn('flex items-center justify-center', tomPorId(id), className)}>
      <Icone className="h-7 w-7 opacity-80" strokeWidth={1.8} />
    </span>
  )
}
