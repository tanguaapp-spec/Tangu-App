import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types/database'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { FormularioPerfil } from '@/components/perfil/formulario-perfil'
import { SelosContribuicao } from '@/components/perfil/selos-contribuicao'
import { CartaoIndicacao } from '@/components/perfil/cartao-indicacao'
import { SaldoLaranjas } from '@/components/perfil/saldo-laranjas'
import { CartoesFidelidade } from '@/components/perfil/cartoes-fidelidade'
import { PreferenciasComunicacao } from '@/components/perfil/preferencias-comunicacao'
import { PrivacidadeDados } from '@/components/perfil/privacidade-dados'
import { SeletorTema } from '@/components/tema/seletor-tema'
import Link from 'next/link'
import { buscarSaldoLaranjas } from '@/lib/gamificacao/pontos'
import { buscarCartoesFidelidadeDoUsuario } from '@/lib/queries/negocios'

export const dynamic = 'force-dynamic'

export default async function PaginaPerfil({ searchParams }: { searchParams: { senha?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/perfil')

  const { data: perfil } = await supabase.rpc('meu_perfil').maybeSingle<Perfil>()
  if (!perfil) redirect('/entrar?next=/perfil')

  const [{ count: totalAvaliacoes }, { count: totalFavoritos }, { count: totalIndicados }, saldoLaranjas, cartoesFidelidade] =
    await Promise.all([
      supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
      supabase.from('favoritos').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id),
      createServiceClient().from('perfis').select('id', { count: 'exact', head: true }).eq('convidado_por', user.id),
      buscarSaldoLaranjas(user.id),
      buscarCartoesFidelidadeDoUsuario(user.id),
    ])

  const primeiroNome = perfil.nome_completo?.split(' ')[0] || 'você'
  const { data: negocioProprio } = await supabase.from('negocios').select('id').eq('reivindicado_por', user.id).maybeSingle()

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="relative overflow-hidden rounded-b-[28px] bg-serra-escuro px-4 pb-6 pt-3 text-white sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-mata-400 opacity-20 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <User className="h-7 w-7" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold">Olá, {primeiroNome}!</h1>
            {perfil.bairro && <p className="text-sm text-white/80">{perfil.bairro}, Tanguá</p>}
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

      <nav aria-label="Atalhos da conta" className="mb-6 grid grid-cols-3 gap-2 text-center text-sm">
        {[
          ['/notificacoes', 'Notificações'],
          ['/orcamentos', 'Meus orçamentos'],
          ['/ajuda/chamados', 'Meus chamados'],
        ].map(([href, rotulo]) => (
          <Link key={href} href={href} className="rounded-xl border border-barro-100 bg-superficie px-2 py-3 font-medium text-barro-800 hover:border-casca-300">
            {rotulo}
          </Link>
        ))}
      </nav>

      {searchParams.senha === 'alterada' && (
        <p role="status" className="mb-4 rounded-xl bg-mata-50 p-3 text-sm text-mata-800">
          Senha alterada com sucesso.
        </p>
      )}

      <FormularioPerfil perfil={perfil} />

      <section id="comunicacao" aria-labelledby="titulo-comunicacao" className="mt-6 scroll-mt-20 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <h2 id="titulo-comunicacao" className="font-display text-lg font-semibold text-barro-900">
          Comunicação
        </h2>
        <p className="mb-3 text-sm text-barro-600">
          Escolha os avisos que quer receber.{' '}
          <Link href="/notificacoes" className="underline">
            Ver minhas notificações
          </Link>
        </p>
        <PreferenciasComunicacao
          preferencias={(perfil as Perfil & { preferencias_notificacao?: Record<string, boolean> }).preferencias_notificacao ?? null}
          resumoDiario={perfil.notificacoes_resumo_diario ?? true}
        />
      </section>

      <section aria-labelledby="titulo-aparencia" className="mt-6 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <h2 id="titulo-aparencia" className="font-display text-lg font-semibold text-barro-900">
          Aparência
        </h2>
        <p className="mb-3 text-sm text-barro-600">Automático segue o modo claro/escuro do seu celular.</p>
        <SeletorTema />
      </section>

      <section id="privacidade" aria-labelledby="titulo-privacidade" className="mt-6 scroll-mt-20 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <h2 id="titulo-privacidade" className="font-display text-lg font-semibold text-barro-900">
          Privacidade e dados
        </h2>
        <div className="mt-3">
          <PrivacidadeDados temNegocio={!!negocioProprio} />
        </div>
      </section>
      </div>
    </div>
  )
}
