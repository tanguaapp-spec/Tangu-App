'use client'

import { useEffect, useState } from 'react'

/**
 * true enquanto o teclado do celular está aberto. Como nos apps nativos, a
 * barra inferior se esconde nessa hora — senão o Android a empurra pra cima
 * do teclado e ela fica "flutuando" no meio da tela.
 *
 * Dois sinais: campo de texto com foco (vale pro iPhone, que não redimensiona
 * a tela) e a área visível encolhendo bastante (Android).
 */
export function useTecladoAberto() {
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    const ehCampo = (el: Element | null) =>
      !!el &&
      (el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement ||
        (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'file', 'range', 'color'].includes(el.type)) ||
        (el as HTMLElement).isContentEditable)

    const vv = window.visualViewport
    const atualizar = () => {
      const encolheu = vv ? window.innerHeight - vv.height > 150 : false
      setAberto(ehCampo(document.activeElement) || encolheu)
    }
    const aoSairDoCampo = () => setTimeout(atualizar, 50)

    document.addEventListener('focusin', atualizar)
    document.addEventListener('focusout', aoSairDoCampo)
    vv?.addEventListener('resize', atualizar)
    return () => {
      document.removeEventListener('focusin', atualizar)
      document.removeEventListener('focusout', aoSairDoCampo)
      vv?.removeEventListener('resize', atualizar)
    }
  }, [])

  return aberto
}
