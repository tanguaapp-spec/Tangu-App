import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { FormularioPerfil } from '@/components/perfil/formulario-perfil'

export const dynamic = 'force-dynamic'

export default async function PaginaPerfil() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/entrar')

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mata-100 text-mata-600">
          <User className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-medium text-barro-900">Meu perfil</h1>
      </div>

      <FormularioPerfil perfil={perfil} />
    </div>
  )
}
