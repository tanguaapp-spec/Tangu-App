'use server'

import { revalidatePath } from 'next/cache'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { lerPrecoCentavos } from '@/lib/admin/configuracoes'

/** Lança quanto foi gasto em divulgação (Instagram, panfleto…) — base do CAC. */
export async function registrarInvestimento(formData: FormData) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return { erro: auth.erro }
  const canal = String(formData.get('canal') ?? '').trim()
  const valor = lerPrecoCentavos(formData.get('valor'))
  const mes = String(formData.get('mes') ?? '')
  if (canal.length < 2 || canal.length > 60) return { erro: 'Diga onde foi o investimento (ex.: Anúncio no Instagram).' }
  if (!Number.isFinite(valor) || valor <= 0) return { erro: 'Informe um valor maior que zero.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mes)) return { erro: 'Informe a data.' }
  const { error } = await createServiceClient()
    .from('investimentos_marketing')
    .insert({ canal, valor_centavos: valor, mes, observacao: String(formData.get('observacao') ?? '').trim().slice(0, 200) || null })
  if (error) return { erro: 'Não foi possível salvar.' }
  revalidatePath('/painel/admin/crescimento')
  return { erro: null }
}
