import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { FormularioPerfil } from '@/components/perfil/formulario-perfil'
import { SelosContribuicao } from '@/components/perfil/selos-contribuicao'
import { CartaoIndicacao } from '@/components/perfil/cartao-indicacao'

export const dynamic = 'force-dynamic'

export default async function PaginaPerfil() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/entrar')

  const [{ count: totalAvaliacoes }, { count: totalFavoritos }, { count: totalIndicados }] = await Promise.all([
    supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
    supabase.from('favoritos').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id),
    supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('convidado_por', user.id),
  ])

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mata-100 text-mata-600">
          <User className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Meu perfil</h1>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-barro-500">Seus selos</h2>
        <SelosContribuicao totalAvaliacoes={totalAvaliacoes ?? 0} totalFavoritos={totalFavoritos ?? 0} />
      </div>

      {perfil.codigo_convite && (
        <div className="mb-6">
          <CartaoIndicacao codigoConvite={perfil.codigo_convite} totalIndicados={totalIndicados ?? 0} />
        </div>
      )}

      <FormularioPerfil perfil={perfil} />
    </div>
  )
}
