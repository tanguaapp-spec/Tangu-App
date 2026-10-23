import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Negocio } from '@/lib/types/database'

export type PapelNoNegocio = 'dono' | 'gerente' | 'atendente'

/**
 * Negócio que a pessoa logada administra: o dela (dona) ou um em que é
 * colaboradora (0020). Uma vez por request (cache do React), usado pelo
 * layout e pelas páginas do painel.
 */
export const negocioDoPainel = cache(async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, negocio: null, papel: null }

  const { data: proprio } = await supabase.from('negocios').select('*, categoria:categorias(*)').eq('reivindicado_por', user.id).maybeSingle()
  if (proprio) return { user, negocio: proprio as unknown as Negocio, papel: 'dono' as PapelNoNegocio }

  const { data: membro } = await supabase
    .from('membros_negocio')
    .select('papel, negocio:negocios(*, categoria:categorias(*))')
    .eq('perfil_id', user.id)
    .limit(1)
    .maybeSingle()
  const negocio = (membro as { negocio?: Negocio } | null)?.negocio ?? null
  return { user, negocio, papel: negocio ? ((membro as { papel: PapelNoNegocio }).papel ?? 'atendente') : null }
})

/** Pra páginas internas: sem login → entrar; sem negócio → tela inicial do painel. */
export async function exigirNegocio(caminho: string) {
  const r = await negocioDoPainel()
  if (!r.user) redirect(`/entrar?next=${encodeURIComponent(caminho)}`)
  if (!r.negocio) redirect('/painel/negocio')
  return r as { user: NonNullable<typeof r.user>; negocio: Negocio; papel: PapelNoNegocio }
}
