import type { Metadata } from 'next'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { buscarCategorias } from '@/lib/queries/negocios'
import { FormularioEditarNegocio } from '@/components/painel/formulario-editar-negocio'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Perfil do negócio', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaPerfilNegocio() {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/perfil')
  return (
    <>
      <TituloPainel titulo="Perfil do negócio" descricao="O que aparece pra quem abre seu perfil: nome, descrição, contato, horário e fotos." voltar="/painel/negocio/mais" />
      {papel === 'dono' ? (
        <CartaoPainel>
          <FormularioEditarNegocio negocio={negocio as never} categorias={(await buscarCategorias()) as never} />
        </CartaoPainel>
      ) : (
        <p className="rounded-[20px] bg-casca-100 p-4 text-sm text-barro-900">
          Só a pessoa dona do negócio edita o perfil. Você pode cuidar do catálogo, das ofertas, das novidades e dos orçamentos.
        </p>
      )}
    </>
  )
}
