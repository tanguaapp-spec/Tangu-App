import { cn } from '@/lib/utils'

/**
 * Símbolo da marca (out/2026): alfinete de mapa ("é daqui, é perto") com a
 * laranja cortada da cidade da laranja e a folha da serra.
 *
 * - `cor`: alfinete verde Serra — para fundo claro.
 * - `sobre-escuro`: alfinete branco — para o cabeçalho verde e fundo escuro.
 * - `auto` (padrão): segue o tema claro/escuro.
 * Cores fixas de propósito: a marca não muda com o tema; quem escolhe a
 * variante é o fundo onde ela está.
 */
export function LogoTangua({
  className,
  variante = 'auto',
}: {
  className?: string
  /** `auto`: verde no tema claro, branco no escuro (superfícies que seguem o tema) */
  variante?: 'auto' | 'cor' | 'sobre-escuro'
}) {
  if (variante === 'auto') {
    return (
      <>
        <LogoTangua variante="cor" className={cn(className, 'dark:hidden')} />
        <LogoTangua variante="sobre-escuro" className={cn(className, 'hidden dark:block')} />
      </>
    )
  }
  const alfinete = variante === 'cor' ? '#0E4D3A' : '#FFFFFF'
  const folha = variante === 'cor' ? '#3FA36B' : '#7FD3A1'
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M32 4C18 4 8 14.5 8 28c0 17 24 32 24 32s24-15 24-32C56 14.5 46 4 32 4z" fill={alfinete} />
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
      <path d="M41 8c5-4.5 11-4 14-2-2.5 5.5-8.5 7.5-14 2z" fill={folha} />
    </svg>
  )
}

/** Símbolo + palavra "tanguá" (sempre minúscula). Herda a cor do texto. */
export function MarcaTangua({
  className,
  tamanho = 'md',
  variante = 'auto',
}: {
  className?: string
  tamanho?: 'sm' | 'md' | 'lg'
  variante?: 'auto' | 'cor' | 'sobre-escuro'
}) {
  const simbolo = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-12 w-12' }[tamanho]
  const texto = { sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl' }[tamanho]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoTangua variante={variante} className={simbolo} />
      <span className={cn('font-display font-bold leading-none', texto)}>tanguá</span>
    </span>
  )
}
