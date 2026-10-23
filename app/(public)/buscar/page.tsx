import type { Metadata } from 'next'
import { TelaExplorar, type ParamsExplorar } from '@/components/busca/tela-explorar'

export const metadata: Metadata = {
  title: 'Explorar comércios e profissionais',
  description: 'Busque comércios, profissionais e serviços de Tanguá. Filtre por aberto agora, com oferta, verificados e quem vai até você.',
}

// a busca depende dos filtros da URL e do relógio ("aberto agora")
export const dynamic = 'force-dynamic'

export default function PaginaBuscar({ searchParams }: { searchParams: ParamsExplorar }) {
  return <TelaExplorar params={searchParams} />
}
