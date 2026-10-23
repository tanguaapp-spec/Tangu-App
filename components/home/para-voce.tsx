'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { clienteSupabaseNavegador, useSessao } from '@/components/layout/sessao'
import { CartaoNegocio } from '@/components/vitrine/cartao-negocio'
import { TituloSecao } from '@/components/vitrine/titulo-secao'
import type { NegocioResumo } from '@/lib/ui/apresentacao'

/**
 * "Pra você": negócios das categorias que a pessoa marcou nos interesses
 * (assistente de boas-vindas / perfil). Sem interesses, convida a marcar.
 */
export function ParaVoce() {
  const { logado, carregado } = useSessao()
  const [negocios, setNegocios] = useState<NegocioResumo[] | null>(null)
  const [semInteresses, setSemInteresses] = useState(false)

  useEffect(() => {
    if (!carregado || !logado) return
    ;(async () => {
      const supabase = await clienteSupabaseNavegador()
      const { data: perfil } = await supabase.rpc('meu_perfil').maybeSingle()
      const interesses = ((perfil as { categorias_interesse?: string[] } | null)?.categorias_interesse ?? []).slice(0, 10)
      if (interesses.length === 0) {
        setSemInteresses(true)
        return
      }
      const { data } = await supabase
        .from('negocios')
        .select('*, categoria:categorias(nome, slug, icone)')
        .in('categoria_id', interesses)
        .eq('ativo', true)
        .eq('status_cadastro', 'aprovado')
        .order('destaque_ativo', { ascending: false })
        .order('foto_capa_url', { ascending: true, nullsFirst: false })
        .limit(8)
      setNegocios((data ?? []) as NegocioResumo[])
    })()
  }, [carregado, logado])

  if (!logado) return null
  if (semInteresses) {
    return (
      <Link
        href="/bem-vindo"
        className="mx-5 flex items-center justify-between gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4 text-sm md:mx-0"
      >
        <span>
          <b className="block text-barro-900">Deixe o início com a sua cara</b>
          <span className="text-barro-600">Marque o que te interessa e mostramos isso primeiro.</span>
        </span>
        <span className="shrink-0 font-bold text-casca-700">Escolher</span>
      </Link>
    )
  }
  if (!negocios || negocios.length === 0) return null
  return (
    <section aria-labelledby="t-para-voce" className="flex flex-col gap-3">
      <TituloSecao id="t-para-voce" titulo="Pra você" descricao="Das categorias que você marcou" href="/perfil#interesses" rotuloLink="Ajustar" className="px-5 md:px-0" />
      <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:grid md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:overflow-visible md:px-0">
        {negocios.map((n) => (
          <CartaoNegocio key={n.id} negocio={n} origem="home" className="w-40 shrink-0 snap-start md:w-auto" />
        ))}
      </div>
    </section>
  )
}
