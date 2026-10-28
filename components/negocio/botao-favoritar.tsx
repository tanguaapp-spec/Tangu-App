'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useState, useTransition } from 'react'
import { alternarFavorito } from '@/lib/actions/negocio-actions'
import { vibrar } from '@/lib/ui/vibrar'
import { cn } from '@/lib/utils'

/**
 * Coração do perfil. Sem conta, leva pra entrar e volta pro mesmo perfil
 * (antes o botão simplesmente não aparecia pra quem não estava logado).
 */
export function BotaoFavoritar({
  negocioId,
  initialIsFavorito,
  logado = true,
  voltarPara,
  variante = 'icone',
  className,
}: {
  negocioId: string
  initialIsFavorito: boolean
  logado?: boolean
  voltarPara?: string
  variante?: 'icone' | 'texto'
  className?: string
}) {
  const [pendente, iniciar] = useTransition()
  const [favorito, setFavorito] = useState(initialIsFavorito)
  const rotulo = favorito ? 'Remover dos favoritos' : 'Favoritar'
  const conteudo = (
    <>
      <Heart className={cn('h-5 w-5', favorito ? 'fill-casca-700 text-casca-700' : 'text-casca-700')} aria-hidden="true" />
      {variante === 'texto' && (favorito ? 'Favoritado' : 'Favoritar')}
    </>
  )

  if (!logado) {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(voltarPara ?? `/negocio/${negocioId}`)}`} aria-label={variante === 'icone' ? 'Entrar para favoritar' : undefined} className={className}>
        {conteudo}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        vibrar(12)
        iniciar(async () => {
          const antes = favorito
          setFavorito(!antes)
          const r = await chamarAcao(alternarFavorito(negocioId))
          if (r.erro) setFavorito(antes)
        })
      }}
      disabled={pendente}
      aria-label={variante === 'icone' ? rotulo : undefined}
      aria-pressed={favorito}
      data-testid="botao-favoritar"
      className={className}
    >
      {conteudo}
    </button>
  )
}
