'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'

export async function registrarErroCliente(mensagem: string, stack?: string, url?: string) {
  if (typeof mensagem !== 'string' || !mensagem) return
  // endpoint público (server action) — limita por IP pra não virar canal de flood
  if (!(await dentroDoLimite(`erro-cliente:${ipDoRequest()}`, 20, 60 * 60))) return

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await registrarErro({
    mensagem,
    contexto: 'client (error boundary)',
    stack,
    url,
    usuarioId: user?.id ?? null,
  })
}
