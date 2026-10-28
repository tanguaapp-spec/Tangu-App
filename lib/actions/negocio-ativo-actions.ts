'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_NEGOCIO_ATIVO, negociosDaConta } from '@/lib/painel/negocio-atual'

/** Troca o negócio que o painel mostra. Só aceita negócio que a conta administra. */
export async function trocarNegocioAtivo(formData: FormData) {
  const id = String(formData.get('negocio_id') ?? '')
  const { user, negocios } = await negociosDaConta()
  if (!user) redirect('/entrar?next=/painel/negocio')
  if (negocios.some((n) => n.id === id)) {
    cookies().set(COOKIE_NEGOCIO_ATIVO, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 365 })
  }
  redirect('/painel/negocio')
}
