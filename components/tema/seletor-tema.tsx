'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { aplicarTema, lerPreferencia, type PreferenciaTema } from '@/lib/tema/preferencia'

const OPCOES: { valor: PreferenciaTema; rotulo: string; icone: typeof Sun }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: Sun },
  { valor: 'escuro', rotulo: 'Escuro', icone: Moon },
  { valor: 'sistema', rotulo: 'Auto', icone: Monitor },
]

/**
 * Claro / Escuro / Automático (segue o celular). `compacto` = um botão só
 * que alterna claro↔escuro, pra cabeçalhos.
 */
export function SeletorTema({ compacto, className, sobreEscuro = false }: { compacto?: boolean; className?: string; /** em fundo escuro (menu lateral do painel) */ sobreEscuro?: boolean }) {
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
    // grade de 3 colunas que ocupa a largura disponível: não estoura menu estreito
    <div
      role="radiogroup"
      aria-label="Aparência"
      className={cn('grid w-full max-w-sm grid-cols-3 gap-1 rounded-xl p-1', sobreEscuro ? 'bg-white/[0.08]' : 'border border-barro-200 bg-superficie', className)}
    >
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
              'flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs font-semibold transition-colors',
              sobreEscuro
                ? ativo
                  ? 'bg-[#E3F0E8] text-[#0E4D3A]'
                  : 'text-[#E3F0E8] hover:bg-white/10'
                : ativo
                  ? 'bg-mata-100 text-mata-800'
                  : 'text-barro-600 hover:bg-barro-50'
            )}
          >
            <o.icone className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">{o.rotulo}</span>
          </button>
        )
      })}
    </div>
  )
}
