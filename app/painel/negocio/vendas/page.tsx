import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowUpRight, CalendarCheck, ShoppingBag } from 'lucide-react'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { recursosDoNegocio } from '@/lib/planos/recursos'
import { lerConfig } from '@/lib/config/ler'
import { salvarVendasWhatsapp } from '@/lib/actions/vendas-actions'
import { TituloPainel, CartaoPainel } from '@/components/painel/titulo-painel'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { RecursoBloqueado } from '@/components/painel/recurso-bloqueado'

export const metadata: Metadata = { title: 'Pedidos e agenda', robots: { index: false } }
export const dynamic = 'force-dynamic'

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base'
const real = (c?: number) => (c ? (c / 100).toFixed(2).replace('.', ',') : '')

export default async function PaginaVendas() {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/vendas')
  const [{ recursos }, modulos, beloo, fregues] = await Promise.all([
    recursosDoNegocio(negocio.id),
    lerConfig('modulos_ativos'),
    lerConfig('link_beloo'),
    lerConfig('link_fregues'),
  ])
  const cfg = negocio.config_pedidos ?? {}
  const temPedidos = recursos.pedidos_whatsapp === true && modulos.pedidos_whatsapp !== false
  const temAgenda = recursos.agenda_whatsapp === true && modulos.agenda_whatsapp !== false

  return (
    <div className="flex flex-col gap-5">
      <TituloPainel
        titulo="Pedidos e agenda pelo WhatsApp"
        descricao="O cliente monta o pedido pelo seu catálogo ou escolhe um horário livre, e a mensagem chega pronta no seu WhatsApp. Você confirma na conversa."
        voltar="/painel/negocio/mais"
      />
      {!negocio.whatsapp && (
        <p className="rounded-2xl bg-casca-50 p-4 text-sm text-casca-900">
          Cadastre o WhatsApp do negócio em{' '}
          <Link href="/painel/negocio/perfil" className="font-bold underline">
            Perfil
          </Link>{' '}
          para usar.
        </p>
      )}

      {!temPedidos && !temAgenda ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          <RecursoBloqueado recurso="pedidos_whatsapp" souDono={papel === 'dono'} />
          <RecursoBloqueado recurso="agenda_whatsapp" souDono={papel === 'dono'} />
        </div>
      ) : (
        <CartaoPainel>
          <FormularioAcao acao={salvarVendasWhatsapp} rotuloBotao="Salvar">
            <div className="flex flex-col gap-5">
              {temPedidos ? (
                <fieldset className="flex flex-col gap-3">
                  <label className="flex min-h-11 items-center gap-3 font-semibold text-barro-900">
                    <input type="checkbox" name="pedidos_whatsapp" defaultChecked={!!negocio.pedidos_whatsapp} className="h-5 w-5" />
                    <ShoppingBag className="h-5 w-5 text-mata-700" aria-hidden="true" /> Receber pedidos pelo catálogo
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-3 pl-8 sm:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" name="retirada" defaultChecked={cfg.retirada !== false} className="h-5 w-5" /> Cliente pode retirar
                    </label>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" name="entrega" defaultChecked={cfg.entrega !== false} className="h-5 w-5" /> Faço entrega
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-barro-700">
                      Taxa de entrega (R$)
                      <input name="taxa_entrega" inputMode="decimal" defaultValue={real(cfg.taxa_entrega_centavos)} placeholder="0,00" className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-barro-700">
                      Pedido mínimo (R$)
                      <input name="pedido_minimo" inputMode="decimal" defaultValue={real(cfg.pedido_minimo_centavos)} placeholder="0,00" className={campo} />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-barro-700 sm:col-span-2">
                      Aviso no pedido (opcional)
                      <input name="observacao" maxLength={200} defaultValue={cfg.observacao ?? ''} placeholder="Ex.: Entregamos só no Centro e em Duques" className={campo} />
                    </label>
                  </div>
                  <p className="pl-8 text-xs text-barro-500">Os itens e preços vêm do seu Catálogo. Item com “a partir de” vai como “a combinar”.</p>
                </fieldset>
              ) : (
                <input type="hidden" name="entrega" value="on" />
              )}
              {temAgenda && (
                <fieldset className="flex flex-col gap-2">
                  <label className="flex min-h-11 items-center gap-3 font-semibold text-barro-900">
                    <input type="checkbox" name="agenda_whatsapp" defaultChecked={!!negocio.agenda_whatsapp} className="h-5 w-5" />
                    <CalendarCheck className="h-5 w-5 text-mata-700" aria-hidden="true" /> Receber pedidos de horário
                  </label>
                  <p className="pl-8 text-sm text-barro-600">
                    Os horários livres saem do seu horário de funcionamento. Para cada serviço do{' '}
                    <Link href="/painel/negocio/catalogo" className="font-semibold underline">
                      Catálogo
                    </Link>
                    , informe a duração em minutos; sem duração, o app oferece um atendimento de 30 min.
                  </p>
                </fieldset>
              )}
            </div>
          </FormularioAcao>
        </CartaoPainel>
      )}

      <CartaoPainel titulo="Quer controle completo?" descricao="Ferramentas do mesmo time do Tanguá App, para quem precisa de mais do que o pedido pelo WhatsApp.">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2">
          <a href={String(beloo)} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 rounded-2xl border border-barro-200 p-4 hover:bg-barro-50">
            <b className="flex items-center gap-1.5 text-barro-900">
              Beloo: agenda completa <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </b>
            <span className="text-sm text-barro-600">Cliente marca sozinho, sem horário duplicado, com lembretes, pacotes, pagamento online e financeiro.</span>
          </a>
          <a href={String(fregues)} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-1 rounded-2xl border border-barro-200 p-4 hover:bg-barro-50">
            <b className="flex items-center gap-1.5 text-barro-900">
              Freguês: cardápio e pedidos <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </b>
            <span className="text-sm text-barro-600">Cardápio digital com variações, controle dos pedidos, entregas e relatório de vendas.</span>
          </a>
        </div>
      </CartaoPainel>
    </div>
  )
}
