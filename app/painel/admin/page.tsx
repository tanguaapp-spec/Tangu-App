import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Store, ShieldCheck, Briefcase, Megaphone, Users } from 'lucide-react'

export default async function PainelAdminVisaoGeral() {
  const supabase = createClient()

  const [
    { count: totalNegocios },
    { count: totalVerificados },
    { count: cadastrosPendentes },
    { count: solicitacoesPendentes },
    { count: vagasAbertas },
    { count: totalUsuarios },
  ] = await Promise.all([
    supabase.from('negocios').select('*', { count: 'exact', head: true }),
    supabase.from('negocios').select('*', { count: 'exact', head: true }).eq('verificado', true),
    supabase.from('negocios').select('*', { count: 'exact', head: true }).eq('status_cadastro', 'pendente'),
    supabase.from('solicitacoes_reivindicacao').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('vagas').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
    supabase.from('perfis').select('*', { count: 'exact', head: true }),
  ])

  const cartoes = [
    { rotulo: 'Negócios cadastrados', valor: totalNegocios ?? 0, icone: Store, cor: 'casca', href: '/buscar' },
    { rotulo: 'Perfis verificados', valor: totalVerificados ?? 0, icone: ShieldCheck, cor: 'mata', href: null },
    { rotulo: 'Cadastros pendentes', valor: cadastrosPendentes ?? 0, icone: Store, cor: 'casca', href: '/painel/admin/negocios-pendentes' },
    { rotulo: 'Reivindicações pendentes', valor: solicitacoesPendentes ?? 0, icone: ShieldCheck, cor: 'casca', href: '/painel/admin/reivindicacoes' },
    { rotulo: 'Vagas abertas', valor: vagasAbertas ?? 0, icone: Briefcase, cor: 'mata', href: '/painel/admin/vagas' },
    { rotulo: 'Usuários cadastrados', valor: totalUsuarios ?? 0, icone: Users, cor: 'casca', href: null },
  ]

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Visão geral</h1>
      <p className="text-barro-600">Painel administrativo do Tanguá App</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cartoes.map((c) => {
          const conteudo = (
            <>
              <c.icone className={`h-5 w-5 ${c.cor === 'casca' ? 'text-casca-500' : 'text-mata-500'}`} />
              <p className="mt-2 text-3xl font-semibold text-barro-900">{c.valor}</p>
              <p className="text-sm text-barro-500">{c.rotulo}</p>
            </>
          )
          return c.href ? (
            <Link
              key={c.rotulo}
              href={c.href}
              className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira transition-all hover:-translate-y-0.5 hover:shadow-feira-lg"
            >
              {conteudo}
            </Link>
          ) : (
            <div key={c.rotulo} className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
              {conteudo}
            </div>
          )
        })}
      </div>
    </div>
  )
}
