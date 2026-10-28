import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { createPublicClient } from '@/lib/supabase/server'
import { exigirModulo } from '@/lib/config/ler'
import { BotaoCompartilhar } from '@/components/ui/botao-compartilhar'
import { urlDoSite } from '@/lib/site'
import { urlSegura } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function buscar(slug: string) {
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) return null
  const { data } = await createPublicClient()
    .from('noticias')
    .select('slug, titulo, resumo, corpo, imagem_url, fonte_nome, fonte_url, patrocinada, publicada_em')
    .eq('slug', slug)
    .eq('status', 'publicada')
    .maybeSingle()
  return data
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const n = await buscar(params.slug)
  if (!n) return { title: 'Notícia não encontrada', robots: { index: false } }
  return { title: n.titulo, description: n.resumo ?? n.corpo.slice(0, 155), alternates: { canonical: `/noticias/${n.slug}` } }
}

export default async function PaginaNoticia({ params }: { params: { slug: string } }) {
  await exigirModulo('noticias')
  const n = await buscar(params.slug)
  if (!n) notFound()
  const fonte = urlSegura(n.fonte_url)
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4 px-5 pb-10 pt-5 md:px-6 md:pt-10">
      <Link href="/noticias" className="-ml-1 inline-flex min-h-11 items-center gap-0.5 self-start text-sm font-semibold text-barro-600">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Notícias
      </Link>
      <p className="text-sm font-semibold text-barro-500">
        {new Date(n.publicada_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' })}
        {n.fonte_nome && ` · ${n.fonte_nome}`}
        {n.patrocinada && <span className="ml-2 rounded-full bg-casca-100 px-2 py-0.5 text-casca-800">Conteúdo patrocinado</span>}
      </p>
      <h1 className="font-display text-3xl font-bold leading-tight text-barro-900 md:text-4xl">{n.titulo}</h1>
      {n.imagem_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.imagem_url} alt="" className="w-full rounded-[22px] object-cover" />
      )}
      {n.resumo && <p className="text-lg font-semibold text-barro-800">{n.resumo}</p>}
      {n.corpo && n.corpo !== n.resumo && <div className="whitespace-pre-line text-[17px] leading-relaxed text-barro-900">{n.corpo}</div>}
      <div className="flex flex-wrap gap-2 pt-2">
        {fonte && (
          <a href={fonte} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-[14px] border-[1.5px] border-barro-200 px-4 text-sm font-semibold text-barro-900">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ler na fonte original
          </a>
        )}
        <BotaoCompartilhar url={`${urlDoSite()}/noticias/${n.slug}`} titulo={n.titulo} />
      </div>
    </article>
  )
}
