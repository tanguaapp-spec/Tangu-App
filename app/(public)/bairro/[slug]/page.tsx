import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { bairrosComNegocios } from '@/lib/queries/negocios'
import { TelaExplorar, type ParamsExplorar } from '@/components/busca/tela-explorar'

export const dynamic = 'force-dynamic'

async function bairro(slug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return null
  return (await bairrosComNegocios()).find((b) => b.slug === slug) ?? null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const b = await bairro(params.slug)
  if (!b) return { title: 'Bairro não encontrado', robots: { index: false } }
  return {
    title: `Comércios e serviços no ${b.nome}, Tanguá`,
    description: `${b.total} comércios e profissionais no bairro ${b.nome}, em Tanguá-RJ: veja quem está aberto, ofertas e fale direto no WhatsApp.`,
    alternates: { canonical: `/bairro/${b.slug}` },
  }
}

/** Página do bairro: mesma tela do Explorar, filtrada pelo bairro (bom pro Google e pra quem procura perto de casa). */
export default async function PaginaBairro({ params, searchParams }: { params: { slug: string }; searchParams: ParamsExplorar }) {
  const b = await bairro(params.slug)
  if (!b) notFound()
  return <TelaExplorar params={searchParams} base={`/bairro/${b.slug}`} titulo={`No ${b.nome}`} descricao={`${b.total} comércios e profissionais no bairro.`} fixos={{ bairro: b.nome }} />
}
