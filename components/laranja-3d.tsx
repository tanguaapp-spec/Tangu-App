import { cn } from '@/lib/utils'

/**
 * A "laranja" do hero — a mascote visual do app (Tanguá = "terra da laranja").
 *
 * De propósito NÃO é WebGL/three.js: é sombreamento em CSS (gradientes +
 * sombras internas) simulando volume 3D, com flutuação e "squish" no
 * toque/hover. Isso roda liso em qualquer celular (só transform/opacity,
 * aceleradas por GPU), sem baixar nenhum asset extra e sem risco de travar
 * em aparelho fraco por falta de suporte a WebGL — só puxa um pouco mais
 * de bateria/JS num efeito que a maioria dos usuários vai ver de relance.
 */
export function Laranja3D({ className }: { className?: string }) {
  return (
    <div className={cn('relative select-none', className)} aria-hidden="true">
      {/* sombra projetada no "chão", pulsa em contraponto à flutuação */}
      <div
        className="absolute inset-x-[14%] bottom-[2%] h-[10%] rounded-full bg-barro-900 blur-lg"
        style={{ animation: 'flutua-sombra 5s ease-in-out infinite' }}
      />

      {/* flutuação + rotação suave e contínua */}
      <div
        className="relative mx-auto w-full max-w-[300px]"
        style={
          {
            animation: 'flutua 5s ease-in-out infinite',
            '--flutua-rot': '-5deg',
            '--flutua-rot-fim': '4deg',
          } as React.CSSProperties
        }
      >
        {/* talo + folha, por cima da esfera */}
        <svg
          viewBox="0 0 100 60"
          className="absolute left-1/2 top-[2%] z-10 w-[30%] -translate-x-1/2 -translate-y-[55%]"
        >
          <path d="M50 55 C 50 30, 50 20, 48 5" stroke="#4A372A" strokeWidth="5" strokeLinecap="round" fill="none" />
          <path
            d="M48 8 C 20 -4, 8 18, 30 32 C 42 40, 50 26, 48 8 Z"
            fill="#4F7A3D"
          />
          <path d="M48 8 C 34 12, 26 20, 30 30" stroke="#2E4A24" strokeWidth="2" fill="none" opacity="0.5" />
        </svg>

        {/* esfera: sombreamento simula volume; squish no hover/toque */}
        <div
          className="relative aspect-square w-full rounded-full transition-transform duration-300 ease-out hover:scale-x-[1.08] hover:scale-y-[0.94] active:scale-x-[0.92] active:scale-y-[1.08]"
          style={{
            background:
              'radial-gradient(circle at 34% 30%, #FFE0B8 0%, #FFB465 22%, #FB9233 42%, #EF7A1A 62%, #D2640F 82%, #AC4E0C 100%)',
            boxShadow:
              'inset -20px -22px 44px rgba(124,58,10,0.5), inset 14px 16px 32px rgba(255,246,236,0.4), 0 30px 60px -16px rgba(124,58,10,0.5)',
          }}
        >
          {/* poros da casca */}
          <div
            className="absolute inset-0 rounded-full opacity-[0.35] mix-blend-multiply"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(124,58,10,0.55) 1px, transparent 1.6px)',
              backgroundSize: '10px 10px',
            }}
          />
          {/* gomos (linhas sutis saindo do centro, como o motivo-gomo) */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full opacity-[0.18]">
            {[...Array(8)].map((_, i) => (
              <line
                key={i}
                x1="100"
                y1="100"
                x2={100 + 100 * Math.cos((i * Math.PI) / 4)}
                y2={100 + 100 * Math.sin((i * Math.PI) / 4)}
                stroke="#7E3A0C"
                strokeWidth="1"
              />
            ))}
          </svg>
          {/* brilho especular */}
          <div
            className="absolute left-[18%] top-[15%] h-[20%] w-[24%] rounded-full bg-white blur-[7px]"
            style={{ animation: 'gomo-brilho 5s ease-in-out infinite' }}
          />
        </div>
      </div>
    </div>
  )
}
