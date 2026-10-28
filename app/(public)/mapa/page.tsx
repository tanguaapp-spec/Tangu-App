import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { createPublicClient } from '@/lib/supabase/server'
import { exigirModulo } from '@/lib/config/ler'
import { comHorariosEspeciais } from '@/lib/queries/negocios'
import { situacaoHorario } from '@/lib/horario/funcionamento'
import { Skeleton } from '@/components/ui/skeleton'
import type { PontoMapa } from '@/components/mapa/mapa-negocios'

// o Leaflet só funciona no navegador
const MapaNegocios = dynamic(() => import('@/components/mapa/mapa-negocios').then((m) => m.MapaNegocios), {
  ssr: false,
  loading: () => <Skeleton className="h-[60vh] min-h-[320px] w-full rounded-[22px]" />,
})

export const metadata: Metadata = {
  title: 'Mapa de Tanguá',
  description: 'Comércios e serviços de Tanguá no mapa. Veja o que está aberto perto de você.',
  alternates: { canonical: '/mapa' },
}
export const revalidate = 300

export default async function PaginaMapa() {
  await exigirModulo('mapa')
  const { data } = await createPublicClient()
    .from('negocios')
    .select('id, nome, slug, latitude, longitude, horario_funcionamento, aberto_agora, tipo_perfil, categoria:categorias(nome)')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(2000)
  // autônomo não tem endereço público: fica fora do mapa
  const lista = await comHorariosEspeciais((data ?? []).filter((n) => n.tipo_perfil !== 'autonomo' && n.slug))
  const pontos: PontoMapa[] = lista.map((n) => ({
    id: n.id,
    nome: n.nome,
    slug: n.slug as string,
    lat: Number(n.latitude),
    lng: Number(n.longitude),
    categoria: (n.categoria as unknown as { nome?: string } | null)?.nome ?? null,
    aberto: situacaoHorario(n.horario_funcionamento, n.aberto_agora).aberto,
  }))

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Mapa de Tanguá</h1>
      <p className="mb-4 mt-1 text-sm text-barro-600 md:text-base">{pontos.length} comércios com endereço no mapa. Toque em um ponto para ver o perfil.</p>
      <MapaNegocios pontos={pontos} />
    </div>
  )
}
