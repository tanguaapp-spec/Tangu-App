import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buscarCategorias } from '@/lib/queries/negocios'
import { FormularioPedido } from '@/components/orcamentos/formulario-pedido'
import type { Categoria } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Pedir orçamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaNovoOrcamento({ searchParams }: { searchParams: { negocio?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const destino = `/orcamentos/novo${searchParams.negocio ? `?negocio=${searchParams.negocio}` : ''}`
  if (!user) redirect(`/entrar?next=${encodeURIComponent(destino)}`)

  let negocio: { id: string; nome: string; categoria_id: string | null } | null = null
  if (searchParams.negocio && z.string().uuid().safeParse(searchParams.negocio).success) {
    const { data } = await supabase
      .from('negocios')
      .select('id, nome, categoria_id')
      .eq('id', searchParams.negocio)
      .eq('ativo', true)
      .eq('status_cadastro', 'aprovado')
      .maybeSingle()
    negocio = data
  }
  const categorias = (await buscarCategorias()) as Categoria[]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/orcamentos" className="text-sm font-medium text-barro-600 hover:text-casca-600">
        ← Meus orçamentos
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-barro-900">Pedir orçamento</h1>
      <p className="mt-1 text-barro-600">É grátis. As respostas chegam aqui e você recebe um aviso.</p>
      <div className="mt-6 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <FormularioPedido categorias={categorias} negocioEscolhido={negocio} />
      </div>
    </div>
  )
}
