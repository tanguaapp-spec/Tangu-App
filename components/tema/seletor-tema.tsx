'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { aplicarTema, lerPreferencia, type PreferenciaTema } from '@/lib/tema/preferencia'

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
  { valor: 'sistema', rotulo: 'Automático', icone: Monitor },
]

/**
 * Claro / Escuro / Automático (segue o celular). `compacto` = um botão só
 * que alterna claro↔escuro, pra cabeçalhos.
 */
export function SeletorTema({ compacto, className }: { compacto?: boolean; className?: string }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema')
  const [escuro, setEscuro] = useState(false)

  useEffect(() => {
    setPreferencia(lerPreferencia())
    setEscuro(document.documentElement.classList.contains('dark'))
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    const aoMudarSistema = () => {
      if (lerPreferencia() === 'sistema') {
        aplicarTema('sistema')
        setEscuro(document.documentElement.classList.contains('dark'))
      }
    }
    consulta.addEventListener('change', aoMudarSistema)
    return () => consulta.removeEventListener('change', aoMudarSistema)
  }, [])

  function escolher(valor: PreferenciaTema) {
    aplicarTema(valor)
    setPreferencia(valor)
    setEscuro(document.documentElement.classList.contains('dark'))
  }

  if (compacto) {
    const Icone = escuro ? Sun : Moon
    return (
      <button
        type="button"
        onClick={() => escolher(escuro ? 'claro' : 'escuro')}
        aria-label={escuro ? 'Usar tema claro' : 'Usar tema escuro'}
        title={escuro ? 'Tema claro' : 'Tema escuro'}
        className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-colors', className)}
      >
        <Icone className="h-5 w-5" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div role="radiogroup" aria-label="Aparência" className={cn('inline-flex rounded-xl border border-barro-200 bg-superficie p-1', className)}>
      {OPCOES.map((o) => {
        const ativo = preferencia === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => escolher(o.valor)}
            className={cn(
              'flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
              ativo ? 'bg-mata-100 text-mata-800' : 'text-barro-600 hover:bg-barro-50'
            )}
          >
            <o.icone className="h-4 w-4" aria-hidden="true" />
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
