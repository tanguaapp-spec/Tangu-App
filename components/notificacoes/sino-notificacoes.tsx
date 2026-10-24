'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react'
import { ativarPush, desativarPush, estadoPush, type EstadoPush } from '@/lib/push/navegador'
import { cn } from '@/lib/utils'

/** Liga/desliga as notificações deste aparelho (funciona com ou sem conta). */
export function SinoNotificacoes({
  comRotulo = false,
  tema = 'claro',
}: {
  /** mantido por compatibilidade: não depende mais de estar logado */
  logado?: boolean
  comRotulo?: boolean
  tema?: 'claro' | 'escuro'
}) {
  const [estado, setEstado] = useState<EstadoPush | 'carregando'>('carregando')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    estadoPush().then(setEstado)
  }, [])

  if (estado === 'indisponivel') return null

  if (estado === 'precisa-instalar') {
    return (
      <p className={cn('flex items-start gap-2 text-sm text-barro-700', comRotulo ? 'px-3 py-3' : '')}>
        <Bell className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        No iPhone, as notificações funcionam depois de adicionar o app à Tela de Início (Compartilhar → “Adicionar à Tela de Início”) e abrir por lá.
      </p>
    )
  }

  if (estado === 'negado') {
    return (
      <p className={cn('flex items-start gap-2 text-sm', tema === 'escuro' ? 'text-white/70' : 'text-barro-600', comRotulo ? 'px-3 py-3' : '')}>
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Notificações bloqueadas neste navegador. Libere em Configurações do site → Notificações.
      </p>
    )
  }

  const ativo = estado === 'ativo'
  const Icone = estado === 'carregando' ? Loader2 : ativo ? BellRing : Bell
  return (
    <div className="flex flex-col">
      <button
        type="button"
        disabled={estado === 'carregando'}
        onClick={async () => {
          setErro(null)
          setEstado('carregando')
          if (ativo) setEstado(await desativarPush())
          else {
            const r = await ativarPush()
            setEstado(r.estado)
            if (r.erro) setErro(r.erro)
          }
        }}
        aria-label={comRotulo ? undefined : ativo ? 'Desativar notificações' : 'Ativar notificações'}
        className={cn(
          'flex items-center gap-2 transition-colors disabled:opacity-60',
          comRotulo ? 'min-h-[48px] w-full rounded-xl px-3 text-left text-sm font-semibold' : 'h-11 w-11 justify-center rounded-xl',
          ativo
            ? tema === 'escuro'
              ? 'text-casca-400 hover:bg-white/10'
              : 'text-mata-700 hover:bg-mata-50'
            : tema === 'escuro'
              ? 'text-white hover:bg-white/10'
              : 'text-barro-900 hover:bg-barro-50'
        )}
      >
        <Icone className={cn('h-5 w-5', estado === 'carregando' && 'animate-spin')} aria-hidden="true" />
        {comRotulo && (ativo ? 'Notificações ativadas neste aparelho (toque pra desligar)' : 'Ativar notificações neste aparelho')}
      </button>
      {erro && (
        <p role="alert" className="px-3 text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
