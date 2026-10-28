'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { recursoLiberado } from '@/lib/planos/recursos'
import { urlNegocio } from '@/lib/ui/apresentacao'

/** Feriado ou horário diferente num dia. Gravação com o login do dono (RLS confere). */
export async function salvarHorarioEspecial(formData: FormData) {
  const { negocio } = await negocioDoPainel()
  if (!negocio) return { erro: 'Negócio não encontrado.' }
  if (!(await recursoLiberado(negocio.id, 'horarios_especiais'))) return { erro: 'Seu plano não inclui horários especiais.' }
  const data = String(formData.get('data') ?? '')
  const fechado = formData.get('tipo') !== 'especial'
  const abre = String(formData.get('abre') ?? '')
  const fecha = String(formData.get('fecha') ?? '')
  const motivo = String(formData.get('motivo') ?? '').trim().slice(0, 80) || null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: 'Escolha a data.' }
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  if (data < hoje) return { erro: 'Essa data já passou.' }
  if (!fechado && (!/^\d{2}:\d{2}$/.test(abre) || !/^\d{2}:\d{2}$/.test(fecha) || abre >= fecha)) return { erro: 'Informe a hora de abrir e de fechar (abrir antes de fechar).' }

  const { error } = await createClient()
    .from('horarios_especiais')
    .upsert({ negocio_id: negocio.id, data, fechado, abre: fechado ? null : abre, fecha: fechado ? null : fecha, motivo }, { onConflict: 'negocio_id,data' })
  if (error) return { erro: 'Não foi possível salvar agora.' }
  revalidatePath('/painel/negocio/horarios')
  revalidatePath(urlNegocio(negocio))
  return { erro: null }
}

export async function removerHorarioEspecial(formData: FormData) {
  const { negocio } = await negocioDoPainel()
  if (!negocio) return { erro: 'Negócio não encontrado.' }
  await createClient().from('horarios_especiais').delete().eq('id', String(formData.get('id') ?? '')).eq('negocio_id', negocio.id)
  revalidatePath('/painel/negocio/horarios')
  revalidatePath(urlNegocio(negocio))
  return { erro: null }
}
