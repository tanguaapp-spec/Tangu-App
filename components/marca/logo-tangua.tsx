/**
 * Marca do Tanguá App: a laranja, sozinha, sem depender de texto pra ser
 * reconhecida — a mesma lógica visual da Laranja3D do hero, só que
 * achatada e simplificada pra funcionar em qualquer tamanho (até 16px de
 * favicon). Cores fixas (não usa currentColor) porque a marca tem cor
 * própria — casca-500 + folha em mata.
 */
export function LogoTangua({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="32" cy="37" r="23" fill="#EF7A1A" />
      <ellipse cx="23.5" cy="27.5" rx="6.5" ry="4.5" fill="#FFEAD2" opacity="0.5" />
      <path
        d="M32 15 C 23 10, 12 16, 16 27 C 20 34, 30 30, 32 15 Z"
        fill="#4F7A3D"
      />
      <path
        d="M29.5 17 C 23 19.5, 18 24, 17.5 27.5"
        stroke="#2E4A24"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}
