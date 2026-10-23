import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { ListaCupons } from '@/components/painel/lista-cupons'
import { FormularioCriarCupom } from '@/components/painel/formulario-criar-cupom'
import { ValidarCupom } from '@/components/painel/validar-cupom'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'
import type { Cupom } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Ofertas e cupons', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaOfertasPainel() {
  const { negocio } = await exigirNegocio('/painel/negocio/ofertas')
  const { data: cupons } = await createClient().from('cupons').select('*').eq('negocio_id', negocio.id).order('criado_em', { ascending: false })
  return (
    <>
      <TituloPainel
        titulo="Ofertas e cupons"
        descricao="Ofertas valendo aparecem na página inicial e em Ofertas. Quem favoritou seu perfil é avisado. Com limite de cupons, cada pessoa pega um código e você valida no balcão."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:items-start md:gap-6">
        <div className="flex flex-col gap-4">
          <CartaoPainel id="validar" titulo="Validar cupom no balcão" descricao="Digite o código que o cliente mostrar. Cada código vale uma vez.">
            <ValidarCupom />
          </CartaoPainel>
          <CartaoPainel titulo="Suas ofertas">
            <ListaCupons cupons={(cupons ?? []) as Cupom[]} negocioId={negocio.id} />
          </CartaoPainel>
        </div>
        <CartaoPainel id="nova" titulo="Nova oferta">
          <FormularioCriarCupom negocioId={negocio.id} />
        </CartaoPainel>
      </div>
    </>
  )
}
