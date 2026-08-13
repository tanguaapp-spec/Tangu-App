'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { creditarPontos, jaCreditouPontos } from '@/lib/gamificacao/pontos'

export async function atualizarPerfil(data: {
  nome_completo?: string
  telefone?: string
  bairro?: string
  notificacoes_resumo_diario?: boolean
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Usuário não autenticado' }

  const { error } = await supabase
    .from('perfis')
    .update(data)
    .eq('id', user.id)
  if (error) {
    console.error('[ERROR] Erro ao atualizar perfil:', error)
    return { erro: error.message }
  }

  if (data.bairro && !(await jaCreditouPontos(user.id, 'perfil_completo'))) {
    creditarPontos(user.id, 'perfil_completo').catch(() => {})
  }

  revalidatePath('/perfil')
  return { erro: null }
}
