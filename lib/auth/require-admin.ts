import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Fonte única de "é admin da plataforma?": a função eh_admin() no banco,
 * que consulta administradores_plataforma (sem caminho de escrita pela API).
 * Nunca decidir isso por perfis.papel, e-mail ou qualquer coisa vinda do
 * navegador.
 */
export async function verificarAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { erro: 'Não autenticado.' as const }

  const { data: ehAdmin, error } = await supabase.rpc('eh_admin')
  if (error || ehAdmin !== true) {
    return { erro: 'Acesso negado (admin).' as const }
  }

  return { supabase, user } as const
}

export async function requireAdminOrRedirect() {
  const resultado = await verificarAdmin()
  if ('erro' in resultado) redirect('/')
  return resultado
}

/**
 * Admin ou pessoa da equipe de crescimento (0026): pode ver métricas e
 * trabalhar os leads. Antes da 0026, só admin passa.
 */
export async function verificarCrescimento() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { erro: 'Não autenticado.' as const }
  const { data, error } = await supabase.rpc('eh_crescimento')
  if (error || data !== true) {
    const { data: admin } = await supabase.rpc('eh_admin')
    if (admin !== true) return { erro: 'Acesso negado.' as const }
  }
  return { supabase, user } as const
}
