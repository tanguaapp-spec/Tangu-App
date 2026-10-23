import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Só exige login; cada área (negócio, admin) tem o próprio menu.
export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/painel/negocio')
  return <div className="min-h-screen bg-feira">{children}</div>
}
