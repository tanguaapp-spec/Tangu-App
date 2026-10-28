import { createPublicClient } from '@/lib/supabase/server'
import { BannerPago, type BannerNoAr } from '@/components/divulgacao/banner-pago'

/** Busca no servidor os banners pagos no ar daquela posição (nada aparece se não houver). */
export async function VitrineBanners({ posicao, categoriaId, className }: { posicao: 'banner_home' | 'banner_categoria' | 'banner_ofertas' | 'evento' | 'vaga'; categoriaId?: string | null; className?: string }) {
  const { data, error } = await createPublicClient().rpc('banners_no_ar', { p_posicao: posicao, p_categoria_id: categoriaId ?? null })
  // antes da migration 0023 a função não existe: só não mostra nada
  if (error || !data?.length) return null
  return <BannerPago banners={data as BannerNoAr[]} className={className} />
}
