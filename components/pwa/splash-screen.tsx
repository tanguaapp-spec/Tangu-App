'use client'

import { useEffect, useState } from 'react'

/**
 * Tela de abertura com a logo animada — pinta na hora, sem depender de rede:
 * SVG inline (zero requisição de imagem) e <style> inline (zero requisição
 * de CSS), tudo já dentro do primeiro HTML que o navegador recebe. Some
 * sozinha pouco depois do app ficar interativo.
 *
 * Isso é um componente client, mas o React ainda manda a saída dele no HTML
 * gerado no servidor — então ela aparece mesmo antes da hidratação rodar,
 * exatamente o momento em que mais precisa aparecer rápido.
 *
 * Duas garantias de segurança: (1) se o JS falhar por qualquer motivo, o
 * <style> tem uma regra CSS pura que força o sumiço depois de alguns
 * segundos, então a tela nunca fica "presa"; (2) assim que o fade começa,
 * os cliques já passam direto (pointer-events: none), sem esperar a
 * transição visual terminar.
 */
export function SplashScreen() {
  const [escondendo, setEscondendo] = useState(false)
  const [removido, setRemovido] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setEscondendo(true), 550)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (!escondendo) return
    const t2 = setTimeout(() => setRemovido(true), 450)
    return () => clearTimeout(t2)
  }, [escondendo])

  if (removido) return null

  return (
    <div
      id="splash-tangua"
      aria-hidden="true"
      className={escondendo ? 'splash-escondendo' : ''}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0E4D3A',
        opacity: escondendo ? 0 : 1,
        transition: 'opacity 450ms ease',
        pointerEvents: escondendo ? 'none' : 'auto',
      }}
    >
      {/* eslint-disable-next-line react/no-danger */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes splash-pop {
              0% { transform: scale(.6); opacity: 0; }
              60% { transform: scale(1.08); opacity: 1; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes splash-respira {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
            #splash-tangua svg {
              animation: splash-pop .5s cubic-bezier(.2,.8,.2,1) both,
                         splash-respira 1.8s ease-in-out .5s infinite;
            }
            @media (prefers-reduced-motion: reduce) {
              #splash-tangua svg { animation: none; }
            }
            /* rede de segurança: some sozinha mesmo se o JS nunca rodar */
            @keyframes splash-forcar-sumico {
              to { opacity: 0; visibility: hidden; }
            }
            #splash-tangua {
              animation: splash-forcar-sumico .01s 3.5s forwards;
            }
          `,
        }}
      />
      <svg width="96" height="96" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 4C18 4 8 14.5 8 28c0 17 24 32 24 32s24-15 24-32C56 14.5 46 4 32 4z" fill="#FFFFFF" />
        <circle cx="32" cy="27" r="15" fill="#F26A1B" />
        <g stroke="#FFE7D6" strokeWidth="2.2" strokeLinecap="round">
          <path d="M32 27V13" />
          <path d="M32 27l12.1-7" />
          <path d="M32 27l12.1 7" />
          <path d="M32 27v14" />
          <path d="M32 27l-12.1 7" />
          <path d="M32 27l-12.1-7" />
        </g>
        <circle cx="32" cy="27" r="3" fill="#FFE7D6" />
        <path d="M41 8c5-4.5 11-4 14-2-2.5 5.5-8.5 7.5-14 2z" fill="#7FD3A1" />
      </svg>
      <p
        style={{
          marginTop: 14,
          fontFamily: 'var(--font-display), system-ui, sans-serif',
          fontSize: 30,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.02em',
        }}
      >
        tanguá
      </p>
    </div>
  )
}
