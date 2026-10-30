import type { SupabaseClient } from '@supabase/supabase-js'

export type TelefoneConta = { numero: string; origem: 'perfil' | 'negocio' }

/** Celular brasileiro com DDD (10 ou 11 dígitos, com ou sem 55 na frente). */
export function celularValido(tel: string | null | undefined) {
  const d = (tel ?? '').replace(/\D/g, '').replace(/^0+/, '')
  const local = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d
  return local.length === 10 || local.length === 11
}

/**
 * Para onde mandar o link de acesso: só um número que a própria pessoa
 * colocou na conta (WhatsApp ou telefone do perfil) ou no negócio dela.
 * Nunca um número digitado na hora do pedido.
 */
export async function telefoneDaConta(db: SupabaseClient, perfilId: string): Promise<TelefoneConta | null> {
  const [{ data: perfil }, { data: negocios }] = await Promise.all([
    db.from('perfis').select('whatsapp, telefone').eq('id', perfilId).maybeSingle(),
    db.from('negocios').select('whatsapp, telefone').eq('reivindicado_por', perfilId).order('criado_em').limit(5),
  ])
  for (const n of [perfil?.whatsapp, perfil?.telefone]) if (celularValido(n)) return { numero: n as string, origem: 'perfil' }
  for (const neg of negocios ?? []) for (const n of [neg.whatsapp, neg.telefone]) if (celularValido(n)) return { numero: n as string, origem: 'negocio' }
  return null
}
