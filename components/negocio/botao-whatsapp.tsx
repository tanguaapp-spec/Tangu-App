'use client'

import { linkWhatsapp } from '@/lib/utils'
import { registrarCliqueWhatsapp } from '@/lib/actions/negocio-actions'

interface Props {
  negocioId: string
  whatsapp: string
  mensagem?: string
  className?: string
  children: React.ReactNode
}

/** Igual a um <a> normal pro WhatsApp, só que registra o clique pro painel de desempenho do dono. */
export function BotaoWhatsapp({ negocioId, whatsapp, mensagem, className, children }: Props) {
  return (
    <a
      href={linkWhatsapp(whatsapp, mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => registrarCliqueWhatsapp(negocioId).catch(() => {})}
    >
      {children}
    </a>
  )
}
