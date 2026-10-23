import { createClient } from '@/lib/supabase/server'
import { sair } from '@/lib/actions/auth-actions'
import { NavNegocio } from '@/components/painel/nav-negocio'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { urlNegocio } from '@/lib/ui/apresentacao'

export const dynamic = 'force-dynamic'

export default async function LayoutNegocio({ children }: { children: React.ReactNode }) {
  const { negocio } = await negocioDoPainel()
  let pendentes = 0
  if (negocio) {
    const { count } = await createClient()
      .from('pedido_destinatarios')
      .select('pedido_id', { count: 'exact', head: true })
      .eq('negocio_id', negocio.id)
      .is('visto_em', null)
    pendentes = count ?? 0
  }
  const temNegocio = !!negocio && negocio.status_cadastro === 'aprovado'
  const { data: ehAdmin } = await createClient().rpc('eh_admin')
  return (
    <div className="md:flex">
      <NavNegocio pendentes={pendentes} urlPublica={negocio ? urlNegocio(negocio) : null} acaoSair={sair} temNegocio={temNegocio} ehAdmin={ehAdmin === true} />
      <main className="min-w-0 flex-1 pb-[calc(var(--altura-nav)+24px)] md:pb-12">
        <div className="mx-auto max-w-[1100px] px-4 pt-[max(18px,env(safe-area-inset-top))] md:px-[clamp(16px,3vw,40px)] md:pt-6">{children}</div>
      </main>
    </div>
  )
}
