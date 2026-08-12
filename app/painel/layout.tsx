import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { sair } from '@/lib/actions/auth-actions'
import { NavPainel } from '@/components/painel/nav-painel'
import { LayoutDashboard, Store, Briefcase, Megaphone, ShieldCheck } from 'lucide-react'

export default async function LayoutPainel({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: perfil } = await supabase.from('perfis').select('*').eq('id', user.id).single()

  const linksProfissional = [
    { href: '/painel/negocio', rotulo: 'Meu negócio', icone: Store },
  ]
  const linksAdmin = [
    { href: '/painel/admin', rotulo: 'Visão geral', icone: LayoutDashboard },
    { href: '/painel/admin/negocios-pendentes', rotulo: 'Cadastros pendentes', icone: Store },
    { href: '/painel/admin/reivindicacoes', rotulo: 'Reivindicações', icone: ShieldCheck },
    { href: '/painel/admin/vagas', rotulo: 'Vagas', icone: Briefcase },
    { href: '/painel/admin/avisos', rotulo: 'Avisos da cidade', icone: Megaphone },
  ]

  const links = perfil?.papel === 'admin' ? linksAdmin : linksProfissional

  return (
    <div className="flex min-h-screen flex-col bg-feira sm:flex-row">
      <NavPainel links={links} acaoSair={sair} />
      <main className="flex-1 p-6 sm:p-10">{children}</main>
    </div>
  )
}
