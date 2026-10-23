import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { GerenciarEquipe } from '@/components/painel/gerenciar-equipe'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Equipe', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaEquipe() {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/equipe')
  const { data } = await createServiceClient()
    .from('membros_negocio')
    .select('perfil_id, papel, perfil:perfis!membros_negocio_perfil_id_fkey(nome_completo)')
    .eq('negocio_id', negocio.id)
    .order('criado_em')
  const membros = (data ?? []).map((m) => ({
    perfil_id: m.perfil_id as string,
    papel: m.papel as string,
    nome: ((m.perfil as { nome_completo?: string } | null)?.nome_completo ?? 'Sem nome') as string,
  }))
  return (
    <>
      <TituloPainel
        titulo="Equipe"
        descricao="Quem trabalha com você pode cuidar do catálogo, das ofertas (inclusive validar cupom no balcão), das novidades e dos orçamentos. Perfil do negócio e pagamento continuam só com você."
        voltar="/painel/negocio/mais"
      />
      <CartaoPainel>
        <GerenciarEquipe membros={membros} podeEditar={papel === 'dono'} />
      </CartaoPainel>
    </>
  )
}
