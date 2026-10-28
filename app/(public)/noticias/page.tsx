import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { exigirModulo } from '@/lib/config/ler'
import { SugerirNoticia } from '@/components/conteudo/sugerir-noticia'

export const metadata: Metadata = {
  title: 'Notícias de Tanguá',
  description: 'O que está acontecendo em Tanguá: avisos da Prefeitura, obras, saúde, eventos e novidades da cidade.',
  alternates: { canonical: '/noticias' },
}
export const dynamic = 'force-dynamic'

type Noticia = {
  slug: string
  titulo: string
  resumo: string | null
  corpo: string
  imagem_url: string | null
  fonte_nome: string | null
  patrocinada: boolean
  destaque: boolean
  publicada_em: string
}

const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long' })

export default async function PaginaNoticias() {
  await exigirModulo('noticias')
  const supabase = createClient()
  const [{ data: lista }, { data: u }] = await Promise.all([
    supabase
      .from('noticias')
      .select('slug, titulo, resumo, corpo, imagem_url, fonte_nome, patrocinada, destaque, publicada_em')
      .eq('status', 'publicada')
      .order('destaque', { ascending: false })
      .order('publicada_em', { ascending: false })
      .limit(40),
    supabase.auth.getUser(),
  ])
  const noticias = (lista ?? []) as Noticia[]

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Notícias de Tanguá</h1>
      <p className="mt-1 text-sm text-barro-600 md:text-base">Avisos da Prefeitura e novidades da cidade, conferidos pelo time do Tanguá App.</p>
      <div className="mt-4">
        <SugerirNoticia logado={!!u.user} />
      </div>

      {noticias.length === 0 ? (
        <p className="mt-6 rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-6 text-center text-sm text-barro-700">
          Nenhuma notícia publicada ainda. Sabe de algo que a cidade precisa saber? Sugira aqui em cima.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {noticias.map((n) => (
            <li key={n.slug}>
              <Link href={`/noticias/${n.slug}`} className="flex gap-4 rounded-[22px] border border-barro-200/80 bg-superficie p-4">
                {n.imagem_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.imagem_url} alt="" className="h-24 w-24 shrink-0 rounded-2xl object-cover" loading="lazy" />
                )}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="text-xs font-semibold text-barro-500">
                    {data(n.publicada_em)}
                    {n.fonte_nome && ` · ${n.fonte_nome}`}
                    {n.patrocinada && <span className="ml-1 rounded-full bg-casca-100 px-2 py-0.5 text-casca-800">Patrocinado</span>}
                  </span>
                  <b className="font-display text-lg leading-snug text-barro-900">{n.titulo}</b>
                  <span className="line-clamp-2 text-sm text-barro-700">{n.resumo || n.corpo}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
