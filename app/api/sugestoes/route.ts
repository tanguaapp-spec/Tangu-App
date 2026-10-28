import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { termoSeguro } from '@/lib/queries/negocios'

export const dynamic = 'force-dynamic'

/** Sugestões enquanto a pessoa digita (a partir de 2 letras): negócios e categorias. */
export async function GET(request: NextRequest) {
  const termo = termoSeguro(request.nextUrl.searchParams.get('q') ?? '')
  if (termo.length < 2) return NextResponse.json({ negocios: [], categorias: [] })
  const db = createPublicClient()
  const [{ data: negocios }, { data: categorias }] = await Promise.all([
    db
      .from('negocios')
      .select('nome, slug, bairro, categoria:categorias(nome)')
      .eq('ativo', true)
      .eq('status_cadastro', 'aprovado')
      .ilike('nome', `%${termo}%`)
      .order('destaque_ativo', { ascending: false })
      .order('verificado', { ascending: false })
      .limit(6),
    db.from('categorias').select('nome, slug').ilike('nome', `%${termo}%`).limit(3),
  ])
  return NextResponse.json(
    {
      negocios: (negocios ?? []).filter((n) => n.slug).map((n) => ({ nome: n.nome, slug: n.slug, detalhe: [(n.categoria as unknown as { nome?: string } | null)?.nome, n.bairro].filter(Boolean).join(' · ') })),
      categorias: categorias ?? [],
    },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
