import type { Metadata } from 'next'
import { CheckCircle2, Clock, Eye, MessageCircle, MousePointerClick, XCircle } from 'lucide-react'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sincronizarCompra } from '@/lib/pagamentos/compras'
import { mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { lerConfig } from '@/lib/config/ler'
import { formatarCentavos } from '@/lib/queries/planos'
import { lerOpcoesServico, linkWhatsappComercial, rotuloPeriodo, ROTULO_STATUS_COMPRA } from '@/lib/divulgacao/servicos'
import { TituloPainel, CartaoPainel } from '@/components/painel/titulo-painel'
import { BotaoComprar } from '@/components/divulgacao/botao-comprar'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Divulgação', robots: { index: false } }
export const dynamic = 'force-dynamic'

const TOM = {
  neutro: 'bg-barro-100 text-barro-700',
  ok: 'bg-mata-100 text-mata-800',
  alerta: 'bg-casca-100 text-casca-800',
  erro: 'bg-red-100 text-red-800',
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—')

export default async function PaginaDivulgacao({ searchParams }: { searchParams: { compra?: string } }) {
  const { negocio } = await exigirNegocio('/painel/negocio/divulgacao')

  // volta do checkout: confere no Mercado Pago na hora (não espera o webhook)
  const compraRetorno = searchParams.compra && /^[0-9a-f-]{36}$/i.test(searchParams.compra) ? searchParams.compra : null
  if (compraRetorno && mercadoPagoConfigurado()) {
    const { data: minha } = await createClient().from('compras_servicos').select('id').eq('id', compraRetorno).maybeSingle()
    if (minha) await sincronizarCompra(minha.id).catch(() => null)
  }

  const [{ data: servicos }, { data: compras }, whatsapp] = await Promise.all([
    createServiceClient().from('servicos_pagos').select('id, nome, descricao, opcoes, requer_arte').eq('ativo', true).order('ordem'),
    createClient()
      .from('compras_servicos')
      .select('id, nome_servico, dias, valor_centavos, status, pago_em, inicia_em, termina_em, impressoes, cliques, criado_em')
      .eq('negocio_id', negocio.id)
      .order('criado_em', { ascending: false })
      .limit(30),
    lerConfig('whatsapp_comercial'),
  ])

  const destaque = compraRetorno ? (compras ?? []).find((c) => c.id === compraRetorno) : null
  const codigo = (id: string) => id.slice(0, 8).toUpperCase()
  const linkZap = (c: { id: string; nome_servico: string }) =>
    linkWhatsappComercial(
      String(whatsapp),
      `Olá! Comprei "${c.nome_servico}" no Tanguá App para ${negocio.nome} (pedido ${codigo(c.id)}). Vamos combinar a arte?`
    )

  return (
    <div className="flex flex-col gap-5">
      <TituloPainel
        titulo="Divulgar meu negócio"
        descricao="Banner, destaque na busca e posts no Instagram do Tanguá App. Você paga aqui pelo Mercado Pago (Pix, cartão ou boleto) e a gente combina a arte com você pelo WhatsApp."
        voltar="/painel/negocio/mais"
      />

      {destaque && (
        <section
          role="status"
          className={cn(
            'flex flex-col gap-3 rounded-[24px] p-5',
            destaque.status === 'recusada' ? 'bg-red-50 text-red-900' : destaque.status === 'aguardando_pagamento' ? 'bg-casca-50 text-casca-900' : 'bg-mata-50 text-mata-900'
          )}
        >
          <div className="flex items-start gap-3">
            {destaque.status === 'recusada' ? (
              <XCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : destaque.status === 'aguardando_pagamento' ? (
              <Clock className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold">
                {destaque.status === 'recusada'
                  ? 'O pagamento não foi aprovado'
                  : destaque.status === 'aguardando_pagamento'
                    ? 'Estamos esperando a confirmação do pagamento'
                    : destaque.status === 'no_ar'
                      ? 'Pagamento aprovado e já está no ar!'
                      : 'Pagamento aprovado!'}
              </h2>
              <p className="mt-1 text-sm">
                {destaque.status === 'recusada'
                  ? 'Nenhum valor foi cobrado. Você pode tentar de novo com outra forma de pagamento.'
                  : destaque.status === 'aguardando_pagamento'
                    ? 'Pix e cartão costumam confirmar em segundos; boleto pode levar até 2 dias úteis. Esta página atualiza quando você voltar.'
                    : destaque.status === 'no_ar'
                      ? `${destaque.nome_servico} vai até ${data(destaque.termina_em)}.`
                      : `Agora é só chamar a gente no WhatsApp pra combinar a arte de "${destaque.nome_servico}". Código do pedido: ${codigo(destaque.id)}.`}
              </p>
            </div>
          </div>
          {destaque.status === 'pago' && linkZap(destaque) && (
            <a
              href={linkZap(destaque)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[#1F8A4C] px-5 font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> Chamar o Tanguá App no WhatsApp
            </a>
          )}
        </section>
      )}

      {(servicos ?? []).length === 0 ? (
        <CartaoPainel>
          <p className="text-barro-700">Nenhuma opção de divulgação à venda no momento. Volte em breve!</p>
        </CartaoPainel>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {(servicos ?? []).map((s) => {
            const opcoes = lerOpcoesServico(s.opcoes)
            if (opcoes.length === 0) return null
            return (
              <CartaoPainel key={s.id} titulo={s.nome} descricao={s.descricao}>
                <p className="mb-3 text-xs text-barro-600">
                  {s.requer_arte ? 'Depois do pagamento, combinamos a arte pelo WhatsApp e publicamos.' : 'Entra no ar assim que o pagamento é aprovado.'}
                  {opcoes.length === 1 && ` ${rotuloPeriodo(opcoes[0].dias)}.`}
                </p>
                <BotaoComprar servicoId={s.id} opcoes={opcoes} />
              </CartaoPainel>
            )
          })}
        </div>
      )}

      {(compras ?? []).length > 0 && (
        <CartaoPainel titulo="Suas compras">
          <ul className="flex flex-col divide-y divide-barro-100">
            {(compras ?? []).map((c) => {
              const st = ROTULO_STATUS_COMPRA[c.status] ?? ROTULO_STATUS_COMPRA.encerrada
              return (
                <li key={c.id} className="flex flex-col gap-2 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="min-w-0 flex-1 text-barro-900">{c.nome_servico}</b>
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', TOM[st.tom])}>{st.texto}</span>
                  </div>
                  <p className="text-sm text-barro-600">
                    {rotuloPeriodo(c.dias)} · {formatarCentavos(c.valor_centavos)} · pedido {codigo(c.id)}
                    {c.inicia_em && ` · de ${data(c.inicia_em)} a ${data(c.termina_em)}`}
                  </p>
                  {(c.status === 'no_ar' || c.status === 'encerrada') && (c.impressoes > 0 || c.cliques > 0) && (
                    <p className="flex flex-wrap gap-4 text-sm text-barro-700">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-4 w-4" aria-hidden="true" /> {c.impressoes} visualizações
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MousePointerClick className="h-4 w-4" aria-hidden="true" /> {c.cliques} cliques
                      </span>
                    </p>
                  )}
                  {c.status === 'pago' && linkZap(c) && (
                    <a href={linkZap(c)!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start font-bold text-mata-700 underline">
                      <MessageCircle className="h-4 w-4" aria-hidden="true" /> Combinar a arte no WhatsApp
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </CartaoPainel>
      )}
    </div>
  )
}
