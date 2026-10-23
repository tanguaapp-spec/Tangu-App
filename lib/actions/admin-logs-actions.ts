'use server'

import { revalidatePath } from 'next/cache'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'

const UUID = /^[0-9a-f-]{36}$/i

/**
 * Resolve (ou reabre) um grupo de erros: todos os registros com os ids
 * informados. A nota fica gravada pra quem olhar depois saber o que foi feito.
 */
export async function marcarErrosResolvidos(ids: string[], formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const validos = ids.filter((id) => UUID.test(id)).slice(0, 500)
  if (validos.length === 0) return { erro: 'Nada pra marcar.' }
  const nota = String(formData.get('nota') ?? '').trim().slice(0, 500) || null
  const { error } = await createServiceClient()
    .from('error_logs')
    .update({ resolvido_em: new Date().toISOString(), resolvido_por: auth.user.id, nota_resolucao: nota })
    .in('id', validos)
  if (error) {
    return { erro: /resolvido/.test(error.message) ? 'Rode a migration 0021 no Supabase pra poder marcar erros como resolvidos.' : error.message }
  }
  revalidatePath('/painel/admin/logs')
  return { erro: null }
}

export async function reabrirErros(ids: string[]) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const validos = ids.filter((id) => UUID.test(id)).slice(0, 500)
  const { error } = await createServiceClient()
    .from('error_logs')
    .update({ resolvido_em: null, resolvido_por: null, nota_resolucao: null })
    .in('id', validos)
  if (error) return { erro: error.message }
  revalidatePath('/painel/admin/logs')
  return { erro: null }
}
