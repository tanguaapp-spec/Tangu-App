'use client'

import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Chip com lista nativa (categoria, bairro, ordem): troca e já navega. */
export function SeletorFiltro({
  rotulo,
  valor,
  opcoes,
  urls,
}: {
  rotulo: string
  valor: string
  opcoes: { valor: string; rotulo: string }[]
  /** url pronta pra cada valor (montada no servidor) */
  urls: Record<string, string>
}) {
  const router = useRouter()
  const ativo = valor !== ''
  const atual = opcoes.find((o) => o.valor === valor)
  return (
    <label
      className={cn(
        'relative flex h-10 shrink-0 items-center gap-1 rounded-full pl-3.5 pr-2.5 text-[13px]',
        ativo ? 'bg-serra font-bold text-white' : 'border border-barro-200 bg-superficie font-semibold text-barro-900'
      )}
    >
      <span>{ativo ? atual?.rotulo ?? rotulo : rotulo}</span>
      <ChevronDown className="h-4 w-4" aria-hidden="true" />
      <select
        aria-label={rotulo}
        value={valor}
        onChange={(e) => router.push(urls[e.target.value] ?? urls[''])}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </label>
  )
}
