import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo'
  tamanho?: 'sm' | 'md' | 'lg'
  carregando?: boolean
}

const variantes = {
  // laranja da marca com texto TINTA (branco no laranja fica em ~3:1, reprova
  // no WCAG). Contraste dos dois temas coberto em lib/tema/paleta.test.ts.
  primario: 'bg-laranja text-tinta hover:bg-laranja-claro active:bg-laranja shadow-feira',
  secundario: 'bg-serra text-white hover:bg-serra-escuro active:bg-serra-escuro',
  fantasma: 'bg-transparent text-barro-800 hover:bg-barro-100 border border-barro-300',
  perigo: 'bg-red-600 text-white hover:bg-red-700',
}

const tamanhos = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-base rounded-xl',
  lg: 'px-7 py-3.5 text-lg rounded-2xl',
}

export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(
  ({ className, variante = 'primario', tamanho = 'md', carregando, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || carregando}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-[0.98]',
          variantes[variante],
          tamanhos[tamanho],
          className
        )}
        {...props}
      >
        {carregando && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Botao.displayName = 'Botao'
