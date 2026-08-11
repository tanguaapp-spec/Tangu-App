import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdminOrRedirect() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('papel')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.papel !== 'admin') {
    redirect('/')
  }
}
