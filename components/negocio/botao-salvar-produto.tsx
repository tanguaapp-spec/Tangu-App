'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Bookmark } from 'lucide-react'
import { alternarFavoritoProduto } from '@/lib/actions/negocio-actions'
import { vibrar } from '@/lib/ui/vibrar'
import { cn } from '@/lib/utils'

export function BotaoSalvarProduto({ produtoId, nome, inicial, logado, voltarPara }: { produtoId: string; nome: string; inicial: boolean; logado: boolean; voltarPara: string }) {
  const [salvo, setSalvo] = useState(inicial)
  const [pendente, iniciar] = useTransition()
  const classe = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-barro-600 hover:bg-barro-50'
  if (!logado) {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(voltarPara)}`} aria-label={`Entrar para salvar ${nome}`} className={classe}>
        <Bookmark className="h-[18px] w-[18px]" aria-hidden="true" />
      </Link>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={salvo}
      aria-label={salvo ? `Tirar ${nome} dos salvos` : `Salvar ${nome}`}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          vibrar(10)
          const antes = salvo
          setSalvo(!antes)
          const r = await chamarAcao(alternarFavoritoProduto(produtoId))
          if (r.erro) setSalvo(antes)
        })
      }
      className={classe}
    >
      <Bookmark className={cn('h-[18px] w-[18px]', salvo && 'fill-mata-700 text-mata-700')} aria-hidden="true" />
    </button>
  )
}
