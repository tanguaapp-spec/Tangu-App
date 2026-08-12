import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sair } from '@/lib/actions/auth-actions'
import { NavPainel } from '@/components/painel/nav-painel'

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('papel').eq('id', user.id).single()

  return (
    <div className="flex min-h-screen flex-col bg-feira sm:flex-row">
      <NavPainel papel={perfil?.papel} acaoSair={sair} />
      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  )
}
