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
        background: '#2E2219',
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
      <svg width="84" height="84" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="37" r="23" fill="#EF7A1A" />
        <ellipse cx="23.5" cy="27.5" rx="6.5" ry="4.5" fill="#FFEAD2" opacity="0.5" />
        <path d="M32 15 C 23 10, 12 16, 16 27 C 20 34, 30 30, 32 15 Z" fill="#4F7A3D" />
        <path
          d="M29.5 17 C 23 19.5, 18 24, 17.5 27.5"
          stroke="#2E4A24"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
      <p
        style={{
          marginTop: 16,
          fontFamily: 'Georgia, serif',
          fontSize: 21,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '-0.01em',
        }}
      >
        Tanguá <span style={{ color: '#FB9233' }}>App</span>
      </p>
    </div>
  )
}
