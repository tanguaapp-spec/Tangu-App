import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { categoriasOrdenadas, ofertasVigentes } from '@/lib/queries/home'
import { CartaoOferta } from '@/components/vitrine/cartao-oferta'
import { prazoCurto, urlNegocio } from '@/lib/ui/apresentacao'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Ofertas valendo em Tanguá',
  description: 'Promoções e cupons publicados pelos comércios e profissionais de Tanguá, com prazo e preço de verdade.',
}
export const dynamic = 'force-dynamic'

type MeuCupom = {
  codigo: string
  usado_em: string | null
  cupom: { titulo: string; expira_em: string; negocio: { id: string; slug?: string | null; nome: string } | null } | null
}

export default async function PaginaOfertas({ searchParams }: { searchParams: { categoria?: string } }) {
  const supabase = createClient()
  const categoriaSlug = searchParams.categoria && /^[a-z0-9-]{1,60}$/.test(searchParams.categoria) ? searchParams.categoria : undefined
  const [
    ofertas,
    categorias,
    {
      data: { user },
    },
  ] = await Promise.all([ofertasVigentes(60, categoriaSlug), categoriasOrdenadas(), supabase.auth.getUser()])

  let meus: MeuCupom[] = []
  if (user) {
    const { data } = await supabase
      .from('cupom_resgates')
      .select('codigo, usado_em, cupom:cupons(titulo, expira_em, negocio:negocios(*))')
      .eq('perfil_id', user.id)
      .is('usado_em', null)
      .order('criado_em', { ascending: false })
      .limit(10)
    meus = ((data ?? []) as unknown as MeuCupom[]).filter((m) => m.cupom && new Date(m.cupom.expira_em) > new Date())
  }

  // só mostra categorias que têm oferta agora (e a escolhida, pra poder desmarcar)
  const comOferta = new Set(ofertas.map((o) => (o.negocio as { categoria?: { slug?: string } } | null)?.categoria?.slug))
  const chips = categoriaSlug ? categorias : categorias.filter((c) => comOferta.has(c.slug))

  return (
    <div className="md:mx-auto md:max-w-[1200px] md:px-6 md:pt-8">
      <header className="flex flex-col gap-3 border-b border-barro-200/80 bg-superficie px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] md:rounded-[28px] md:border md:p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Ofertas</h1>
          <p className="mt-1 text-sm text-barro-600 md:text-base">Publicadas pelos próprios negócios, com prazo. Pegue o cupom e mostre no balcão.</p>
        </div>
        {chips.length > 0 && (
          <nav aria-label="Categorias" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            <Link
              href="/ofertas"
              className={cn(
                'flex h-10 shrink-0 items-center rounded-full px-3.5 text-[13px]',
                !categoriaSlug ? 'bg-barro-900 font-bold text-feira' : 'border border-barro-200 bg-superficie font-semibold text-barro-900'
              )}
            >
              Todas
            </Link>
            {chips.map((c) => (
              <Link
                key={c.id}
                href={categoriaSlug === c.slug ? '/ofertas' : `/ofertas?categoria=${c.slug}`}
                aria-pressed={categoriaSlug === c.slug}
                className={cn(
                  'flex h-10 shrink-0 items-center rounded-full px-3.5 text-[13px]',
                  categoriaSlug === c.slug ? 'bg-serra font-bold text-white' : 'border border-barro-200 bg-superficie font-semibold text-barro-900'
                )}
              >
                {c.nome}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <div className="flex flex-col gap-6 px-5 pb-6 pt-4 md:px-0 md:pt-6">
        {meus.length > 0 && (
          <section aria-labelledby="t-meus" className="flex flex-col gap-3">
            <h2 id="t-meus" className="font-display text-lg font-bold text-barro-900">
              Seus cupons
            </h2>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:px-0">
              {meus.map((m) => (
                <Link
                  key={m.codigo}
                  href={m.cupom?.negocio ? `${urlNegocio(m.cupom.negocio)}#oferta` : '/ofertas'}
                  className="flex w-[240px] shrink-0 flex-col gap-1 rounded-[20px] border-[1.5px] border-dashed border-casca-300 bg-superficie p-4 md:w-auto"
                >
                  <span className="font-mono text-xl font-bold tracking-[0.08em] text-barro-900">{m.codigo}</span>
                  <span className="truncate text-sm font-semibold text-barro-900">{m.cupom?.titulo}</span>
                  <span className="truncate text-xs text-barro-600">
                    {m.cupom?.negocio?.nome} · vence em {m.cupom ? prazoCurto(m.cupom.expira_em) : ''}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {ofertas.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-6 text-center text-sm text-barro-700">
            {categoriaSlug ? 'Nenhuma oferta nessa categoria agora. ' : 'Nenhuma oferta valendo agora. '}
            Tem um negócio?{' '}
            <Link href="/cadastrar?papel=profissional" className="font-bold text-casca-700 underline">
              Publique a sua — é grátis.
            </Link>
          </div>
        ) : (
          <section aria-label="Ofertas valendo" className="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] md:gap-4">
            {ofertas.map((o) => (
              <CartaoOferta key={o.id} oferta={o} grande />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
