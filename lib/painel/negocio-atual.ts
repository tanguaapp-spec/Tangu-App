import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Negocio } from '@/lib/types/database'

export type PapelNoNegocio = 'dono' | 'gerente' | 'atendente'

/** Cookie com o negócio escolhido no seletor do painel (só um id; a permissão é sempre conferida no banco). */
export const COOKIE_NEGOCIO_ATIVO = 'tangua-negocio'

export type NegocioDaConta = { id: string; nome: string; slug: string | null; foto_capa_url: string | null; papel: PapelNoNegocio }

/**
 * Todos os negócios que a pessoa administra: os dela (dona) e aqueles em
 * que é da equipe. Uma vez por request.
 */
export const negociosDaConta = cache(async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, negocios: [] as (NegocioDaConta & { completo: Negocio })[] }

  const [{ data: proprios }, { data: membro }] = await Promise.all([
    supabase.from('negocios').select('*, categoria:categorias(*)').eq('reivindicado_por', user.id).order('criado_em'),
    supabase.from('membros_negocio').select('papel, negocio:negocios(*, categoria:categorias(*))').eq('perfil_id', user.id),
  ])
  const lista: (NegocioDaConta & { completo: Negocio })[] = []
  for (const n of (proprios ?? []) as unknown as Negocio[]) {
    lista.push({ id: n.id, nome: n.nome, slug: n.slug ?? null, foto_capa_url: n.foto_capa_url ?? null, papel: 'dono', completo: n })
  }
  for (const m of (membro ?? []) as unknown as { papel: PapelNoNegocio; negocio: Negocio | null }[]) {
    if (!m.negocio || lista.some((l) => l.id === m.negocio!.id)) continue
    lista.push({ id: m.negocio.id, nome: m.negocio.nome, slug: m.negocio.slug ?? null, foto_capa_url: m.negocio.foto_capa_url ?? null, papel: m.papel ?? 'atendente', completo: m.negocio })
  }
  return { user, negocios: lista }
})

/**
 * Negócio que o painel está mostrando agora: o escolhido no seletor (cookie)
 * ou, sem escolha válida, o primeiro da conta.
 */
export const negocioDoPainel = cache(async () => {
  const { user, negocios } = await negociosDaConta()
  if (!user) return { user: null, negocio: null, papel: null }
  const escolhido = cookies().get(COOKIE_NEGOCIO_ATIVO)?.value
  const atual = negocios.find((n) => n.id === escolhido) ?? negocios[0] ?? null
  return { user, negocio: atual?.completo ?? null, papel: atual?.papel ?? null }
})

/** Pra páginas internas: sem login → entrar; sem negócio → tela inicial do painel. */
export async function exigirNegocio(caminho: string) {
  const r = await negocioDoPainel()
  if (!r.user) redirect(`/entrar?next=${encodeURIComponent(caminho)}`)
  if (!r.negocio) redirect('/painel/negocio')
  return r as { user: NonNullable<typeof r.user>; negocio: Negocio; papel: PapelNoNegocio }
}
