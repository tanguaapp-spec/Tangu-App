'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { inscreverPush, desinscreverPush } from '@/lib/actions/push-actions'
import { cn } from '@/lib/utils'

type Estado = 'indisponivel' | 'carregando' | 'inativo' | 'ativo' | 'negado'

function urlBase64ParaUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Segura = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const bruto = atob(base64Segura)
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)))
}

export function SinoNotificacoes({
  logado,
  comRotulo = false,
  tema = 'claro',
}: {
  logado: boolean
  comRotulo?: boolean
  /** "escuro" ajusta o estado inativo pra ter contraste num fundo escuro (cabeçalho mobile) */
  tema?: 'claro' | 'escuro'
}) {
  const [estado, setEstado] = useState<Estado>('carregando')

  useEffect(() => {
    async function checar() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setEstado('indisponivel')
        return
      }
      if (Notification.permission === 'denied') {
        setEstado('negado')
        return
      }
      try {
        const registro = await navigator.serviceWorker.ready
        const inscricao = await registro.pushManager.getSubscription()
        setEstado(inscricao ? 'ativo' : 'inativo')
      } catch {
        setEstado('indisponivel')
      }
    }
    checar()
  }, [])

  async function ativar() {
    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!chavePublica) {
      setEstado('indisponivel')
      return
    }

    setEstado('carregando')
    try {
      const permissao = await Notification.requestPermission()
      if (permissao !== 'granted') {
        setEstado(permissao === 'denied' ? 'negado' : 'inativo')
        return
      }

      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ParaUint8Array(chavePublica),
      })

      const json = inscricao.toJSON()
      await inscreverPush(
        { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } },
        navigator.userAgent
      )
      setEstado('ativo')
    } catch (err) {
      console.error('Erro ao ativar notificações:', err)
      setEstado('inativo')
    }
  }

  async function desativar() {
    setEstado('carregando')
    try {
      const registro = await navigator.serviceWorker.ready
      const inscricao = await registro.pushManager.getSubscription()
      if (inscricao) {
        await desinscreverPush(inscricao.endpoint)
        await inscricao.unsubscribe()
      }
      setEstado('inativo')
    } catch (err) {
      console.error('Erro ao desativar notificações:', err)
      setEstado('ativo')
    }
  }

  if (!logado || estado === 'indisponivel') return null

  if (estado === 'negado') {
    return (
      <span
        title="Notificações bloqueadas nas configurações do navegador"
        className={cn(
          'flex items-center gap-2',
          tema === 'escuro' ? 'text-barro-400' : 'text-barro-300',
          comRotulo ? 'rounded-lg px-3 py-3 text-sm' : 'h-9 w-9 justify-center rounded-lg'
        )}
      >
        <BellOff className="h-4 w-4" />
        {comRotulo && 'Notificações bloqueadas'}
      </span>
    )
  }

  const ativo = estado === 'ativo'
  const Icone = ativo ? BellRing : Bell

  return (
    <button
      type="button"
      onClick={ativo ? desativar : ativar}
      disabled={estado === 'carregando'}
      title={ativo ? 'Desativar notificações' : 'Ativar notificações'}
      aria-label={ativo ? 'Desativar notificações' : 'Ativar notificações'}
      className={cn(
        'flex items-center gap-2 transition-colors disabled:opacity-50',
        comRotulo
          ? 'w-full rounded-lg px-3 py-3 text-left text-sm'
          : 'h-9 w-9 justify-center rounded-lg',
        ativo
          ? tema === 'escuro'
            ? 'text-casca-400 hover:bg-white/10'
            : 'text-casca-600 hover:bg-casca-50'
          : tema === 'escuro'
            ? 'text-barro-200 hover:bg-white/10 hover:text-white'
            : 'text-barro-500 hover:bg-barro-100 hover:text-barro-800'
      )}
    >
      <Icone className={comRotulo ? 'h-5 w-5' : 'h-4 w-4'} />
      {comRotulo && (ativo ? 'Desativar notificações' : 'Ativar notificações')}
    </button>
  )
}
