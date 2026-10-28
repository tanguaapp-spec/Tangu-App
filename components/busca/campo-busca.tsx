'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Store, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

type Sugestoes = { negocios: { nome: string; slug: string; detalhe: string }[]; categorias: { nome: string; slug: string }[] }

/**
 * Campo de busca com sugestões a partir de 2 letras (negócios e categorias).
 * Continua sendo um <input name="q"> comum: Enter envia o formulário normal.
 * O <label> em volta precisa ser `relative` (a lista abre embaixo dele).
 */
export function CampoBusca({ className, placeholder, rotulo, valorInicial = '' }: { className?: string; placeholder: string; rotulo: string; valorInicial?: string }) {
  const [texto, setTexto] = useState(valorInicial)
  const [dados, setDados] = useState<Sugestoes | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(-1)
  const router = useRouter()
  const idLista = useId()
  const pedido = useRef(0)

  useEffect(() => {
    const t = texto.trim()
    if (t.length < 2) {
      setDados(null)
      return
    }
    const meu = ++pedido.current
    setCarregando(true)
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/sugestoes?q=${encodeURIComponent(t)}`)
        const json = (await r.json()) as Sugestoes
        if (meu === pedido.current) {
          setDados(json)
          setAtivo(-1)
        }
      } catch {
        // sem internet: a busca normal (Enter) continua funcionando
      } finally {
        if (meu === pedido.current) setCarregando(false)
      }
    }, 180)
    return () => clearTimeout(timer)
  }, [texto])

  const opcoes = [
    ...(dados?.categorias ?? []).map((c) => ({ chave: `c-${c.slug}`, href: `/categoria/${c.slug}`, titulo: c.nome, detalhe: 'Categoria', icone: Tag })),
    ...(dados?.negocios ?? []).map((n) => ({ chave: `n-${n.slug}`, href: `/negocio/${n.slug}?origem=busca`, titulo: n.nome, detalhe: n.detalhe, icone: Store })),
  ]
  const mostrar = aberto && texto.trim().length >= 2 && (opcoes.length > 0 || (!carregando && dados !== null))

  return (
    <>
      <input
        name="q"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(e) => {
          if (!mostrar || !opcoes.length) return
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setAtivo((a) => (a + 1) % opcoes.length)
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setAtivo((a) => (a <= 0 ? opcoes.length - 1 : a - 1))
          } else if (e.key === 'Enter' && ativo >= 0) {
            e.preventDefault()
            router.push(opcoes[ativo].href)
          } else if (e.key === 'Escape') setAberto(false)
        }}
        placeholder={placeholder}
        aria-label={rotulo}
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={ativo >= 0 ? `${idLista}-${ativo}` : undefined}
        className={className}
      />
      {carregando && texto.trim().length >= 2 && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-barro-400" aria-hidden="true" />}
      {mostrar && (
        <ul
          id={idLista}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-[60vh] overflow-y-auto rounded-2xl border border-barro-200 bg-superficie p-1.5 text-left shadow-[0_12px_32px_rgba(19,36,29,0.16)]"
        >
          {opcoes.length === 0 ? (
            <li className="px-3 py-3 text-sm text-barro-600">Nada com esse nome. Aperte buscar para procurar em descrições e serviços.</li>
          ) : (
            opcoes.map((o, i) => (
              <li key={o.chave} id={`${idLista}-${i}`} role="option" aria-selected={i === ativo}>
                <a
                  href={o.href}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    router.push(o.href)
                  }}
                  className={cn('flex min-h-12 items-center gap-3 rounded-xl px-3 py-2', i === ativo ? 'bg-mata-50' : 'hover:bg-barro-50')}
                >
                  <o.icone className="h-4 w-4 shrink-0 text-mata-700" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px] text-barro-900">{o.titulo}</b>
                    {o.detalhe && <span className="block truncate text-xs text-barro-600">{o.detalhe}</span>}
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </>
  )
}
