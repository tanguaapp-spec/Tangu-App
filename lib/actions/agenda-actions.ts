'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** "Tenho interesse" num evento da agenda: salva e liga o lembrete da véspera. */
export async function alternarInteresseEvento(avisoId: string): Promise<{ erro: string | null; interessado?: boolean }> {
  if (typeof avisoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(avisoId)) return { erro: 'Evento inválido.' }
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Entre na sua conta pra salvar o evento.' }

  const { data: existente } = await supabase
    .from('interesses_evento')
    .select('aviso_id')
    .eq('aviso_id', avisoId)
    .eq('perfil_id', user.id)
    .maybeSingle()

  if (existente) {
    const { error } = await supabase.from('interesses_evento').delete().eq('aviso_id', avisoId).eq('perfil_id', user.id)
    if (error) return { erro: 'Não foi possível tirar o interesse agora.' }
    revalidatePath('/agenda')
    return { erro: null, interessado: false }
  }

  const { error } = await supabase.from('interesses_evento').insert({ aviso_id: avisoId, perfil_id: user.id })
  if (error) return { erro: 'Não foi possível salvar agora.' }
  revalidatePath('/agenda')
  return { erro: null, interessado: true }
}
