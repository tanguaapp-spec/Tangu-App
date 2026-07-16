import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from 'react'

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  rotulo?: string
  erro?: string
}

export const Campo = forwardRef<HTMLInputElement, CampoProps>(
  ({ className, rotulo, erro, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {rotulo && (
          <label htmlFor={id} className="text-sm font-medium text-barro-800">
            {rotulo}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-barro-300 bg-white px-4 py-2.5 text-barro-900',
            'placeholder:text-barro-300',
            'focus:border-casca-500 focus:ring-2 focus:ring-casca-100',
            'transition-colors',
            erro && 'border-red-400',
            className
          )}
          {...props}
        />
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    )
  }
)
Campo.displayName = 'Campo'

interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo?: string
  erro?: string
}

export const AreaTexto = forwardRef<HTMLTextAreaElement, AreaTextoProps>(
  ({ className, rotulo, erro, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {rotulo && (
          <label htmlFor={id} className="text-sm font-medium text-barro-800">
            {rotulo}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            'w-full rounded-xl border border-barro-300 bg-white px-4 py-2.5 text-barro-900',
            'placeholder:text-barro-300 min-h-[120px] resize-y',
            'focus:border-casca-500 focus:ring-2 focus:ring-casca-100',
            'transition-colors',
            erro && 'border-red-400',
            className
          )}
          {...props}
        />
        {erro && <span className="text-sm text-red-600">{erro}</span>}
      </div>
    )
  }
)
AreaTexto.displayName = 'AreaTexto'
