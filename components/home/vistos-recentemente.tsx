'use client'

import { useEffect, useState } from 'react'
import { CartaoNegocio } from '@/components/vitrine/cartao-negocio'
import { TituloSecao } from '@/components/vitrine/titulo-secao'
import type { NegocioResumo } from '@/lib/ui/apresentacao'

/**
 * "Vistos por você": guardado só neste aparelho (localStorage), nunca vai
 * pro servidor. Some sozinho se a pessoa nunca abriu um perfil.
 */
const CHAVE = 'tangua:vistos'
const MAXIMO = 10

type Visto = Pick<NegocioResumo, 'id' | 'slug' | 'nome' | 'bairro' | 'foto_capa_url' | 'categoria' | 'nota_google' | 'nota_media' | 'total_avaliacoes'>

function ler(): Visto[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? '[]')
    return Array.isArray(bruto) ? bruto.filter((v) => v && typeof v.id === 'string' && typeof v.nome === 'string') : []
  } catch {
    return []
  }
}

export function registrarVisto(n: Visto) {
  try {
    const lista = [n, ...ler().filter((v) => v.id !== n.id)].slice(0, MAXIMO)
    localStorage.setItem(CHAVE, JSON.stringify(lista))
  } catch {
    // modo anônimo/armazenamento cheio: só não lembra
  }
}

export function RegistrarVisto({ negocio }: { negocio: Visto }) {
  useEffect(() => registrarVisto(negocio), [negocio])
  return null
}

export function VistosRecentemente() {
  const [vistos, setVistos] = useState<Visto[]>([])
  useEffect(() => setVistos(ler()), [])
  if (vistos.length === 0) return null
  return (
    <section aria-labelledby="t-vistos" className="flex flex-col gap-3">
      <TituloSecao id="t-vistos" titulo="Vistos por você" className="px-5 md:px-0" />
      <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:grid md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:overflow-visible md:px-0">
        {vistos.map((v) => (
          <CartaoNegocio key={v.id} negocio={v} className="w-40 shrink-0 snap-start md:w-auto" />
        ))}
      </div>
    </section>
  )
}
