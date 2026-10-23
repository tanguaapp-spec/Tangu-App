import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { buscarUsoPlano } from '@/lib/queries/planos'
import { ListaProdutos } from '@/components/painel/lista-produtos'
import { FormularioProduto } from '@/components/painel/formulario-produto'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'
import type { ProdutoServico } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Catálogo', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaCatalogo() {
  const { negocio } = await exigirNegocio('/painel/negocio/catalogo')
  const [{ data: produtos }, uso] = await Promise.all([
    createClient().from('produtos_servicos').select('*').eq('negocio_id', negocio.id).order('ativo', { ascending: false }).order('ordem').order('criado_em'),
    buscarUsoPlano(negocio.id),
  ])
  const limite = uso?.limites.max_produtos
  const autonomo = negocio.tipo_perfil === 'autonomo'

  return (
    <>
      <TituloPainel
        titulo="Catálogo"
        descricao={`${autonomo ? 'Serviços' : 'Produtos e serviços'} com preço aparecem no seu perfil. Quem já vê o preço chega mais decidido.`}
        acao={
          limite && limite.limite !== null ? (
            <span className="rounded-full bg-mata-100 px-3 py-1.5 font-mono text-xs font-bold text-mata-700">
              {limite.uso}/{limite.limite} ativos
            </span>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-[1fr_380px] md:items-start md:gap-6">
        <ListaProdutos produtos={(produtos ?? []) as ProdutoServico[]} negocioId={negocio.id} />
        <CartaoPainel id="novo" titulo="Novo item" descricao="A foto é opcional, mas ajuda muito.">
          <FormularioProduto negocioId={negocio.id} />
        </CartaoPainel>
      </div>
    </>
  )
}
