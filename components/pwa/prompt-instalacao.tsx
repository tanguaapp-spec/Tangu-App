'use client'

import { useEffect, useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { LogoTangua } from '@/components/marca/logo-tangua'

const CHAVE_DISPENSADO = 'tangua-instalar-dispensado'
const CHAVE_VISITAS = 'tangua-visitas'
const VISITAS_MINIMAS = 2

/**
 * Convite pra instalar o app, com nossa cara — em vez de depender do
 * navegador mostrar (ou não) o prompt genérico dele. Só aparece depois da
 * 2ª visita (não quer atropelar quem está vendo o app pela 1ª vez) e nunca
 * mais depois que a pessoa dispensar uma vez.
 *
 * Android/Chrome: captura o evento nativo `beforeinstallprompt` e mostra
 * nosso botão, que dispara o instalador de verdade do navegador.
 * iOS Safari nunca dispara esse evento (não existe API pra instalar
 * programaticamente) — mostramos uma instrução de 2 passos em vez disso.
 */
export function PromptInstalacao() {
  const [eventoInstalar, setEventoInstalar] = useState<any>(null)
  const [mostrarIOS, setMostrarIOS] = useState(false)
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
    if (jaInstalado) return
    if (localStorage.getItem(CHAVE_DISPENSADO)) return

    if (!sessionStorage.getItem('tangua-sessao-contada')) {
      const visitas = Number(localStorage.getItem(CHAVE_VISITAS) || '0') + 1
      localStorage.setItem(CHAVE_VISITAS, String(visitas))
      sessionStorage.setItem('tangua-sessao-contada', '1')
    }
    const visitas = Number(localStorage.getItem(CHAVE_VISITAS) || '0')
    if (visitas < VISITAS_MINIMAS) return

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS) {
      const t = setTimeout(() => {
        setMostrarIOS(true)
        setVisivel(true)
      }, 1500)
      return () => clearTimeout(t)
    }

    function aoTerPrompt(e: Event) {
      e.preventDefault()
      setEventoInstalar(e)
      setVisivel(true)
    }
    window.addEventListener('beforeinstallprompt', aoTerPrompt)
    return () => window.removeEventListener('beforeinstallprompt', aoTerPrompt)
  }, [])

  async function instalar() {
    if (!eventoInstalar) return
    eventoInstalar.prompt()
    await eventoInstalar.userChoice
    setVisivel(false)
  }

  function dispensar() {
    setVisivel(false)
    localStorage.setItem(CHAVE_DISPENSADO, '1')
  }

  if (!visivel) return null

  return (
    <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 md:hidden">
      <div className="flex items-center gap-3 rounded-2xl bg-barro-900 p-3.5 text-white shadow-feira-lg">
        <LogoTangua className="h-10 w-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Instale o Tanguá App</p>
          {mostrarIOS ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-barro-200">
              Toque em <Share className="h-3 w-3 shrink-0" /> e depois em &ldquo;Adicionar à Tela de Início&rdquo;
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-barro-200">Acesso rápido, direto da tela inicial</p>
          )}
        </div>
        {!mostrarIOS && (
          <button
            type="button"
            onClick={instalar}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-casca-500 px-3 py-2 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" /> Instalar
          </button>
        )}
        <button
          type="button"
          onClick={dispensar}
          aria-label="Dispensar"
          className="shrink-0 rounded-full p-1.5 text-barro-300 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
