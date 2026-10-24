'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, Check, Download, Loader2, MoreVertical, PlusSquare, Share } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { LogoTangua } from '@/components/marca/logo-tangua'
import { useSessao } from '@/components/layout/sessao'
import { ativarPush, ehAndroid, ehIOS, estadoPush, instalado, sincronizarPush, type EstadoPush } from '@/lib/push/navegador'
import { cn } from '@/lib/utils'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
declare global {
  interface Window {
    __tanguaInstalar?: EventoInstalar
  }
}

const CHAVE_ADIADO = 'tangua-convite-adiado-ate'
const CHAVE_VEZES = 'tangua-convite-vezes'
const ATRASO_MS = 2500

/** "Agora não": volta em 3 dias; depois de 3 recusas, em 14. */
function adiar() {
  try {
    const vezes = Number(localStorage.getItem(CHAVE_VEZES) || '0') + 1
    localStorage.setItem(CHAVE_VEZES, String(vezes))
    localStorage.setItem(CHAVE_ADIADO, String(Date.now() + (vezes >= 3 ? 14 : 3) * 86400e3))
  } catch {}
}
function adiado() {
  try {
    return Number(localStorage.getItem(CHAVE_ADIADO) || '0') > Date.now()
  } catch {
    return false
  }
}

/**
 * Convite logo na primeira visita, em 2 passos: instalar o app na tela
 * inicial e ativar as notificações da cidade (funciona sem conta). Cada
 * passo mostra o jeito certo pro aparelho: botão de instalar no Android e
 * no computador, instrução de "Adicionar à Tela de Início" no iPhone.
 */
export function ConviteApp() {
  const { logado, carregado } = useSessao()
  const [aberto, setAberto] = useState(false)
  const [jaInstalado, setJaInstalado] = useState(false)
  const [podeInstalar, setPodeInstalar] = useState(false)
  const [push, setPush] = useState<EstadoPush | 'carregando'>('carregando')
  const [instalando, setInstalando] = useState(false)
  const [ativando, setAtivando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const ios = typeof window !== 'undefined' && ehIOS()
  const android = typeof window !== 'undefined' && ehAndroid()

  useEffect(() => {
    let cancelado = false
    const inst = instalado()
    setJaInstalado(inst)
    setPodeInstalar(!!window.__tanguaInstalar)
    const aoPoder = () => setPodeInstalar(true)
    const aoInstalar = () => setJaInstalado(true)
    window.addEventListener('tangua-pode-instalar', aoPoder)
    window.addEventListener('appinstalled', aoInstalar)

    const t = setTimeout(async () => {
      const estado = await estadoPush()
      if (cancelado) return
      setPush(estado)
      const faltaInstalar = !inst
      const faltaNotificar = estado === 'inativo' || estado === 'precisa-instalar'
      if ((faltaInstalar || faltaNotificar) && !adiado()) setAberto(true)
    }, ATRASO_MS)
    return () => {
      cancelado = true
      clearTimeout(t)
      window.removeEventListener('tangua-pode-instalar', aoPoder)
      window.removeEventListener('appinstalled', aoInstalar)
    }
  }, [])

  // entrou na conta num aparelho que já recebia notificações: passa a ser dela
  useEffect(() => {
    if (carregado && logado) sincronizarPush()
  }, [carregado, logado])

  const fechar = useCallback(() => {
    setAberto(false)
    adiar()
  }, [])

  const notificacaoOk = push === 'ativo'
  // tudo pronto: agradece e some sozinho
  useEffect(() => {
    if (aberto && jaInstalado && notificacaoOk) {
      const t = setTimeout(() => setAberto(false), 1800)
      return () => clearTimeout(t)
    }
  }, [aberto, jaInstalado, notificacaoOk])

  async function instalar() {
    const evento = window.__tanguaInstalar
    if (!evento) return
    setInstalando(true)
    await evento.prompt()
    const escolha = await evento.userChoice.catch(() => ({ outcome: 'dismissed' }))
    window.__tanguaInstalar = undefined
    setPodeInstalar(false)
    setInstalando(false)
    if (escolha.outcome === 'accepted') setJaInstalado(true)
  }

  async function ativar() {
    setAtivando(true)
    setErro(null)
    const r = await ativarPush()
    setAtivando(false)
    setPush(r.estado)
    if (r.erro) setErro(r.erro)
    else if (r.aviso) setErro(r.aviso)
  }

  const passo = (feito: boolean, numero: number, titulo: string, children: React.ReactNode) => (
    <li className={cn('flex gap-3 rounded-[20px] border p-4', feito ? 'border-mata-200 bg-mata-50' : 'border-barro-200/80 bg-superficie')}>
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold',
          feito ? 'bg-serra text-white' : 'bg-casca-100 text-casca-800'
        )}
        aria-hidden="true"
      >
        {feito ? <Check className="h-4 w-4" /> : numero}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <b className="text-barro-900">
          {titulo}
          {feito && <span className="sr-only"> (feito)</span>}
        </b>
        {!feito && children}
      </div>
    </li>
  )

  return (
    <BottomSheet aberto={aberto} onFechar={fechar} titulo="Tanguá no seu celular">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <LogoTangua className="h-12 w-12 shrink-0" />
          <p className="text-[15px] leading-snug text-barro-800">
            Instale o app e ative as notificações pra saber <b>primeiro</b> das ofertas, eventos e avisos da cidade.
          </p>
        </div>

        <ol className="flex flex-col gap-2.5">
          {passo(
            jaInstalado,
            1,
            jaInstalado ? 'App instalado' : 'Instale o app',
            podeInstalar ? (
              <button
                type="button"
                onClick={instalar}
                disabled={instalando}
                className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-laranja font-bold text-tinta disabled:opacity-60"
              >
                {instalando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                Instalar agora
              </button>
            ) : ios ? (
              <p className="text-sm leading-relaxed text-barro-700">
                No Safari, toque em <Share className="inline h-4 w-4 align-[-3px] text-mata-700" aria-label="Compartilhar" /> <b>Compartilhar</b>, depois em{' '}
                <PlusSquare className="inline h-4 w-4 align-[-3px] text-mata-700" aria-hidden="true" /> <b>Adicionar à Tela de Início</b>.
              </p>
            ) : android ? (
              <p className="text-sm leading-relaxed text-barro-700">
                Toque no menu <MoreVertical className="inline h-4 w-4 align-[-3px]" aria-label="três pontinhos" /> do navegador e escolha <b>Instalar app</b> ou{' '}
                <b>Adicionar à tela inicial</b>.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-barro-700">
                No Chrome ou Edge, clique no ícone de instalar na barra de endereço (ou no menu ⋮ → <b>Instalar Tanguá App</b>).
              </p>
            )
          )}

          {passo(
            notificacaoOk,
            2,
            notificacaoOk ? 'Notificações ativadas' : 'Ative as notificações',
            push === 'precisa-instalar' ? (
              <p className="text-sm text-barro-700">No iPhone, abra o app pelo ícone na Tela de Início e ative por lá.</p>
            ) : push === 'negado' ? (
              <p className="text-sm text-barro-700">As notificações estão bloqueadas. Libere em Configurações do site → Notificações.</p>
            ) : push === 'indisponivel' ? (
              <p className="text-sm text-barro-700">Este navegador não recebe notificações. Abra pelo Chrome ou instale o app.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={ativar}
                  disabled={ativando || push === 'carregando'}
                  className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-serra font-bold text-white disabled:opacity-60"
                >
                  {ativando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
                  {ativando ? 'Ativando… (pode levar alguns segundos)' : 'Ativar notificações'}
                </button>
                <p className="text-xs text-barro-600">
                  Sem conta e sem spam: só novidades da cidade. Nada de aviso entre 22h e 8h.{!logado && ' Criando conta, você recebe também as ofertas dos lugares que favoritar.'}
                </p>
              </>
            )
          )}
        </ol>

        {erro && (
          <p role="alert" className="text-sm text-red-700">
            {erro}
          </p>
        )}

        {jaInstalado && notificacaoOk ? (
          <p role="status" className="rounded-[14px] bg-mata-100 p-3 text-center font-semibold text-mata-700">
            Tudo pronto! Chegou uma notificação de teste no seu celular.
          </p>
        ) : (
          <button type="button" onClick={fechar} className="h-11 rounded-[14px] text-sm font-semibold text-barro-600 hover:bg-barro-50">
            Agora não
          </button>
        )}
      </div>
    </BottomSheet>
  )
}
