'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { alternarPostAtivo } from '@/lib/actions/painel-negocio-actions'
import { cn } from '@/lib/utils'

type Post = { id: string; titulo: string; tipo: string; ativo: boolean; criado_em: string; imagem_url: string | null }

export function ListaPosts({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [ocupado, setOcupado] = useState<string | null>(null)
  if (posts.length === 0) return <p className="text-sm text-barro-600">Você ainda não publicou nada. A primeira novidade avisa todo mundo que favoritou seu perfil.</p>
  return (
    <ul className="flex flex-col gap-2.5">
      {posts.map((p) => (
        <li key={p.id} className={cn('flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3', !p.ativo && 'opacity-60')}>
          {p.imagem_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.imagem_url} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
          )}
          <span className="min-w-0 flex-1">
            <b className="block truncate text-barro-900">{p.titulo}</b>
            <span className="text-[13px] text-barro-600">
              {p.tipo === 'promocao' ? 'Promoção' : p.tipo === 'vaga_propria' ? 'Vaga' : 'Novidade'} ·{' '}
              {new Date(p.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
              {!p.ativo && ' · fora do perfil'}
            </span>
          </span>
          <button
            type="button"
            disabled={ocupado === p.id}
            onClick={async () => {
              setOcupado(p.id)
              await alternarPostAtivo(p.id, !p.ativo)
              setOcupado(null)
              router.refresh()
            }}
            className="h-10 shrink-0 rounded-xl border border-barro-200 px-3 text-sm font-semibold text-barro-900 disabled:opacity-50"
          >
            {p.ativo ? 'Tirar do perfil' : 'Mostrar de novo'}
          </button>
        </li>
      ))}
    </ul>
  )
}
