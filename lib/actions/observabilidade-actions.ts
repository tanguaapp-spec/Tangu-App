'use server'

import { createClient } from '@/lib/supabase/server'
import { registrarErro } from '@/lib/observabilidade/registrar-erro'

export async function registrarErroCliente(mensagem: string, stack?: string, url?: string) {
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
