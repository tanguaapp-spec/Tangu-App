import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { FormularioPerfil } from '@/components/perfil/formulario-perfil'
import { SelosContribuicao } from '@/components/perfil/selos-contribuicao'
import { CartaoIndicacao } from '@/components/perfil/cartao-indicacao'
import { SaldoLaranjas } from '@/components/perfil/saldo-laranjas'
import { CartoesFidelidade } from '@/components/perfil/cartoes-fidelidade'
import { buscarSaldoLaranjas } from '@/lib/gamificacao/pontos'
import { buscarCartoesFidelidadeDoUsuario } from '@/lib/queries/negocios'

export const dynamic = 'force-dynamic'

export default async function PaginaPerfil() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/entrar')

  const [{ count: totalAvaliacoes }, { count: totalFavoritos }, { count: totalIndicados }, saldoLaranjas, cartoesFidelidade] =
    await Promise.all([
      supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
      supabase.from('favoritos').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id),
      supabase.from('perfis').select('*', { count: 'exact', head: true }).eq('convidado_por', user.id),
      buscarSaldoLaranjas(user.id),
      buscarCartoesFidelidadeDoUsuario(user.id),
    ])

  const primeiroNome = perfil.nome_completo?.split(' ')[0] || 'você'

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="relative overflow-hidden rounded-b-[28px] bg-barro-900 px-4 pb-6 pt-3 text-white sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-casca-500 opacity-25 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <User className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold">Olá, {primeiroNome}!</h1>
            {perfil.bairro && <p className="text-sm text-barro-200">{perfil.bairro}, Tanguá</p>}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <div className="-mt-4 mb-6">
          <SaldoLaranjas saldo={saldoLaranjas} />
        </div>

        {cartoesFidelidade.length > 0 && (
        <div className="mb-6">
          <CartoesFidelidade cartoes={cartoesFidelidade as any} />
        </div>
      )}

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
    </div>
  )
}
