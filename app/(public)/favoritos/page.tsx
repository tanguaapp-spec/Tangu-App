import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buscarFavoritosUsuario } from '@/lib/queries/negocios'
import { CartaoNegocio } from '@/components/vitrine/cartao-negocio'
import { formatarPrecoBRL } from '@/lib/utils'
import { urlNegocio } from '@/lib/ui/apresentacao'

export const metadata: Metadata = { title: 'Favoritos', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Salvo = {
  produto: {
    id: string
    nome: string
    preco: number | null
    preco_a_partir_de: boolean
    imagem_url: string | null
    negocio: { id: string; slug?: string | null; nome: string } | null
  } | null
}

export default async function PaginaFavoritos() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/favoritos')

  const [negocios, { data: salvos }] = await Promise.all([
    buscarFavoritosUsuario(),
    supabase
      .from('favoritos_produtos')
      .select('produto:produtos_servicos(id, nome, preco, preco_a_partir_de, imagem_url, negocio:negocios(*))')
      .eq('perfil_id', user.id)
      .order('criado_em', { ascending: false }),
  ])
  const produtos = ((salvos ?? []) as unknown as Salvo[]).map((s) => s.produto).filter(Boolean) as NonNullable<Salvo['produto']>[]
  const lista = negocios.filter(Boolean)

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Favoritos</h1>
        <p className="mt-1 text-sm text-barro-600">Você é avisado quando eles publicam ofertas e novidades.</p>
      </div>

      {lista.length === 0 && produtos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-8 text-center text-sm text-barro-700">
          <Heart className="h-8 w-8 text-casca-700" aria-hidden="true" />
          Toque no coração de um negócio pra guardar aqui e receber as ofertas dele.
          <Link href="/buscar" className="mt-1 font-bold text-casca-700 underline">
            Explorar Tanguá
          </Link>
        </div>
      ) : (
        <>
          {lista.length > 0 && (
            <section aria-labelledby="t-negocios" className="flex flex-col gap-3">
              <h2 id="t-negocios" className="font-display text-lg font-bold text-barro-900">
                Negócios
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4">
                {lista.map((n) => (
                  <CartaoNegocio key={n.id} negocio={n} />
                ))}
              </div>
            </section>
          )}
          {produtos.length > 0 && (
            <section aria-labelledby="t-produtos" className="flex flex-col gap-3">
              <h2 id="t-produtos" className="font-display text-lg font-bold text-barro-900">
                Produtos e serviços salvos
              </h2>
              <ul className="grid gap-2.5 md:grid-cols-2">
                {produtos.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={p.negocio ? `${urlNegocio(p.negocio)}` : '/buscar'}
                      className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3"
                    >
                      {p.imagem_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imagem_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                      )}
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-barro-900">{p.nome}</b>
                        <span className="block truncate text-[13px] text-barro-600">{p.negocio?.nome}</span>
                      </span>
                      {p.preco != null && <span className="shrink-0 font-mono font-bold text-mata-700">{formatarPrecoBRL(Number(p.preco), p.preco_a_partir_de)}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
