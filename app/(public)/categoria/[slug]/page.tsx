import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/server'
import { TelaExplorar, type ParamsExplorar } from '@/components/busca/tela-explorar'

export const dynamic = 'force-dynamic'

async function categoria(slug: string) {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null
  const { data } = await createPublicClient().from('categorias').select('nome, slug').eq('slug', slug).maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await categoria(params.slug)
  if (!c) return { title: 'Categoria não encontrada' }
  return {
    title: `${c.nome} em Tanguá`,
    description: `${c.nome} em Tanguá/RJ: veja quem está aberto agora, ofertas valendo e fale direto no WhatsApp.`,
    alternates: { canonical: `/categoria/${c.slug}` },
  }
}

/** Página de categoria: mesma tela do Explorar, com endereço próprio (bom pro Google). */
export default async function PaginaCategoria({ params, searchParams }: { params: { slug: string }; searchParams: ParamsExplorar }) {
  const c = await categoria(params.slug)
  if (!c) notFound()
  return (
    <TelaExplorar
      params={searchParams}
      base={`/categoria/${c.slug}`}
      titulo={`${c.nome} em Tanguá`}
      fixos={{ categoria: c.slug }}
    />
  )
}
