'use client'

import { useEffect } from 'react'
import { registrarErroCliente } from '@/lib/actions/observabilidade-actions'

/** Barulho que não é bug do app (extensões, abortos de navegação, avisos do navegador). */
const IGNORAR = /ResizeObserver loop|chrome-extension:|moz-extension:|safari-extension:|AbortError|The user aborted|Load failed$|NEXT_REDIRECT|NEXT_NOT_FOUND|Non-Error promise rejection/i

function extra(origem: string) {
  return {
    origem,
    tela: `${window.innerWidth}x${window.innerHeight}`,
    online: navigator.onLine,
    instalado: window.matchMedia('(display-mode: standalone)').matches,
  }
}

/** Erros de navegador que não passam pela tela de erro: vão pros Logs do admin (uma vez por tipo, por sessão). */
export function reportarErroNavegador(mensagem: string, stack: string | undefined, origem: 'navegador' | 'promessa' | 'acao_sem_resposta') {
  if (!mensagem || IGNORAR.test(mensagem) || IGNORAR.test(stack ?? '')) return
  const chave = `tangua-erro-${origem}-${mensagem.slice(0, 80)}`
  try {
    if (sessionStorage.getItem(chave)) return
    sessionStorage.setItem(chave, '1')
  } catch {}
  registrarErroCliente(mensagem.slice(0, 2000), stack, window.location.href, extra(origem)).catch(() => undefined)
}

/** Liga a captura global uma vez (fica no layout raiz). */
export function CapturarErros() {
  useEffect(() => {
    const aoErro = (e: ErrorEvent) => {
      // erro de recurso (imagem que não carregou) não tem "error": ignora
      if (!e.error && !e.message) return
      reportarErroNavegador(e.message || String(e.error), e.error?.stack, 'navegador')
    }
    const aoRejeitar = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const mensagem = r instanceof Error ? r.message : typeof r === 'string' ? r : ''
      if (mensagem) reportarErroNavegador(mensagem, r instanceof Error ? r.stack : undefined, 'promessa')
    }
    window.addEventListener('error', aoErro)
    window.addEventListener('unhandledrejection', aoRejeitar)
    return () => {
      window.removeEventListener('error', aoErro)
      window.removeEventListener('unhandledrejection', aoRejeitar)
    }
  }, [])
  return null
}
