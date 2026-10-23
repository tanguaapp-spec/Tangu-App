import type { Metadata } from 'next'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { buscarClientesConectados } from '@/lib/queries/negocios'
import { CartaoFidelidadeClientes } from '@/components/painel/cartao-fidelidade-clientes'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Cartão fidelidade', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaFidelidade() {
  const { negocio } = await exigirNegocio('/painel/negocio/fidelidade')
  const clientes = await buscarClientesConectados(negocio.id)
  return (
    <>
      <TituloPainel
        titulo="Cartão fidelidade"
        descricao="Carimbe o cartão de quem já favoritou ou avaliou seu perfil. A cada 10 carimbos o cartão completa e você combina o prêmio pessoalmente."
        voltar="/painel/negocio/mais"
      />
      <CartaoPainel>
        <CartaoFidelidadeClientes negocioId={negocio.id} clientes={clientes} />
      </CartaoPainel>
    </>
  )
}
