import { createClient } from '@/lib/supabase/server'
import { sair } from '@/lib/actions/auth-actions'
import { NavNegocio } from '@/components/painel/nav-negocio'
import { negocioDoPainel, negociosDaConta } from '@/lib/painel/negocio-atual'
import { trocarNegocioAtivo } from '@/lib/actions/negocio-ativo-actions'
import { lerConfig } from '@/lib/config/ler'
import { SeletorNegocio } from '@/components/painel/seletor-negocio'
import { urlNegocio } from '@/lib/ui/apresentacao'
import { ConviteApp } from '@/components/pwa/convite-app'

export const dynamic = 'force-dynamic'

export default async function LayoutNegocio({ children }: { children: React.ReactNode }) {
  const [{ negocio }, { negocios }, maxNegocios] = await Promise.all([negocioDoPainel(), negociosDaConta(), lerConfig('max_negocios_por_dono')])
  const opcoes = negocios.map(({ id, nome, papel }) => ({ id, nome, papel }))
  const podeCadastrar = negocios.filter((n) => n.papel === 'dono').length < Number(maxNegocios)
  const seletor = (tema: 'claro' | 'escuro') =>
    negocio ? <SeletorNegocio negocios={opcoes} atualId={negocio.id} podeCadastrar={podeCadastrar} acaoTrocar={trocarNegocioAtivo} tema={tema} /> : null
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
      <NavNegocio
        pendentes={pendentes}
        urlPublica={negocio ? urlNegocio(negocio) : null}
        acaoSair={sair}
        temNegocio={temNegocio}
        ehAdmin={ehAdmin === true}
        seletor={seletor('escuro')}
      />
      <main className="min-w-0 flex-1 pb-[calc(var(--altura-nav)+24px)] md:pb-12">
        <div className="mx-auto max-w-[1100px] px-4 pt-[max(18px,env(safe-area-inset-top))] md:px-[clamp(16px,3vw,40px)] md:pt-6">
          {/* celular: qual negócio está aberto e troca rápida (no computador fica no menu lateral) */}
          {negocio && <div className="mb-4 md:hidden">{seletor('claro')}</div>}
          {children}
        </div>
      </main>
      {/* lojista também: aviso de pedido de orçamento e de avaliação chega no celular */}
      <ConviteApp />
    </div>
  )
}
