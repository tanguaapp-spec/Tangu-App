import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { buscarAssinaturaAtual, buscarUsoPlano, formatarCentavos, listarPagamentos, listarPlanos } from '@/lib/queries/planos'
import { TabelaPlanos } from '@/components/planos/tabela-planos'
import { BotaoAssinar } from '@/components/planos/botao-assinar'
import { BotaoCancelarAssinatura } from '@/components/planos/botao-cancelar-assinatura'
import { BotaoAtualizarStatus } from '@/components/planos/botao-atualizar-status'
import { ResumoUsoPlano } from '@/components/planos/uso-plano'
import { Selo } from '@/components/ui/selo'

export const metadata: Metadata = { title: 'Plano e assinatura', robots: { index: false } }
export const dynamic = 'force-dynamic'

const ROTULO_PAGAMENTO: Record<string, { texto: string; tom: 'verde' | 'aviso' | 'neutro' | 'laranja' }> = {
  aprovado: { texto: 'Aprovado', tom: 'verde' },
  pendente: { texto: 'Pendente', tom: 'aviso' },
  em_processo: { texto: 'Em análise', tom: 'aviso' },
  recusado: { texto: 'Recusado', tom: 'laranja' },
  estornado: { texto: 'Estornado', tom: 'neutro' },
  cancelado: { texto: 'Cancelado', tom: 'neutro' },
}

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

export default async function PaginaAssinatura({ searchParams }: { searchParams: { retorno?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/painel/negocio/assinatura')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id, nome, status_cadastro')
    .eq('reivindicado_por', user.id)
    .maybeSingle()
  if (!negocio) redirect('/painel/negocio')

  const [planos, uso, assinatura, pagamentos] = await Promise.all([
    listarPlanos(),
    buscarUsoPlano(negocio.id),
    buscarAssinaturaAtual(negocio.id),
    listarPagamentos(negocio.id),
  ])
  const pagamentosAtivos = mercadoPagoConfigurado()
  const planoEfetivo = uso?.plano ?? 'gratuito'
  const nomePlano = (id: string) => planos.find((p) => p.id === id)?.nome ?? id
  const temPago = assinatura && (assinatura.status === 'ativa' || assinatura.status === 'em_atraso')

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/negocio" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 hover:text-casca-600">
        <ArrowLeft className="h-4 w-4" /> Voltar pro painel
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Plano e assinatura</h1>
      <p className="text-barro-600">{negocio.nome}</p>

      {/* situação — sempre a partir do banco, nunca do retorno do checkout */}
      {assinatura?.status === 'pendente' && (
        <div role="status" className="mt-6 flex gap-3 rounded-casca border border-yellow-200 bg-yellow-50 p-5">
          <Clock3 className="h-6 w-6 shrink-0 text-yellow-700" aria-hidden="true" />
          <div className="text-sm text-yellow-900">
            <p className="font-semibold">
              {searchParams.retorno ? 'Recebemos você de volta do Mercado Pago.' : 'Contratação aguardando pagamento.'}
            </p>
            <p className="mt-1">
              O plano {nomePlano(assinatura.plano_id)} é liberado assim que o Mercado Pago confirmar a cobrança — geralmente em poucos
              minutos (Pix e cartão), ou até 3 dias úteis (boleto). Você não precisa fazer nada além de pagar.
            </p>
            <div className="mt-3">
              <BotaoAtualizarStatus />
            </div>
          </div>
        </div>
      )}
      {assinatura?.status === 'em_atraso' && (
        <div role="alert" className="mt-6 flex gap-3 rounded-casca border border-red-200 bg-red-50 p-5">
          <AlertTriangle className="h-6 w-6 shrink-0 text-red-600" aria-hidden="true" />
          <div className="text-sm text-red-900">
            <p className="font-semibold">A última cobrança não foi aprovada.</p>
            <p className="mt-1">
              Os recursos do plano continuam até {data(assinatura.tolerancia_ate)}. O Mercado Pago tenta cobrar de novo
              automaticamente; pra trocar o cartão, acesse sua conta no Mercado Pago em Assinaturas. Se preferir, cancele aqui e o
              negócio volta pro Gratuito sem perder nada.
            </p>
          </div>
        </div>
      )}
      {assinatura?.status === 'ativa' && (
        <div className="mt-6 flex gap-3 rounded-casca border border-mata-200 bg-mata-50 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-mata-600" aria-hidden="true" />
          <div className="text-sm text-mata-900">
            <p className="font-semibold">
              Plano {nomePlano(assinatura.plano_id)} ativo — {formatarCentavos(assinatura.valor_centavos)}/mês
            </p>
            <p className="mt-1">Próxima cobrança por volta de {data(assinatura.periodo_atual_fim)}.</p>
          </div>
        </div>
      )}
      {assinatura?.status === 'cancelada' && (
        <div className="mt-6 rounded-casca border border-barro-200 bg-barro-50 p-5 text-sm text-barro-800">
          Assinatura cancelada em {data(assinatura.cancelada_em)}. Os recursos do plano {nomePlano(assinatura.plano_id)} valem até{' '}
          {data(assinatura.periodo_atual_fim)}; depois o negócio volta pro Gratuito.
        </div>
      )}

      {uso && (
        <section className="mt-6 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
          <h2 className="font-display text-lg font-semibold text-barro-900">Seu consumo</h2>
          <div className="mt-3">
            <ResumoUsoPlano uso={uso} nomePlano={nomePlano(planoEfetivo)} />
          </div>
        </section>
      )}

      <section className="mt-8" aria-labelledby="titulo-planos">
        <h2 id="titulo-planos" className="font-display text-lg font-semibold text-barro-900">
          Planos
        </h2>
        {!pagamentosAtivos && (
          <p className="mt-2 rounded-lg bg-barro-50 p-3 text-sm text-barro-700">
            A contratação de planos pagos ainda não foi liberada. Tudo do plano Gratuito funciona normalmente.
          </p>
        )}
        {negocio.status_cadastro !== 'aprovado' && (
          <p className="mt-2 rounded-lg bg-barro-50 p-3 text-sm text-barro-700">
            Seu cadastro está em análise. Os planos ficam disponíveis assim que ele for liberado.
          </p>
        )}
        <div className="mt-4">
          <TabelaPlanos
            planos={planos}
            planoAtual={planoEfetivo}
            acao={(plano) => {
              if (plano.id === planoEfetivo) return <p className="text-center text-sm font-medium text-mata-700">Plano em uso</p>
              if (!pagamentosAtivos || negocio.status_cadastro !== 'aprovado') return null
              if (plano.preco_centavos === 0) return temPago ? <p className="text-center text-xs text-barro-500">Cancele a assinatura pra voltar ao Gratuito.</p> : null
              const troca = temPago
              return (
                <BotaoAssinar
                  planoId={plano.id}
                  rotulo={troca ? `Mudar para ${plano.nome}` : `Assinar ${plano.nome}`}
                  variante={troca ? 'fantasma' : 'primario'}
                  confirmacao={
                    troca
                      ? `Mudar para o plano ${plano.nome}? Os recursos mudam agora e o novo valor (${formatarCentavos(plano.preco_centavos)}/mês) vale a partir da próxima cobrança.`
                      : undefined
                  }
                />
              )
            }}
          />
        </div>
      </section>

      {assinatura && assinatura.status !== 'cancelada' && (
        <section className="mt-8 rounded-casca border border-barro-100 bg-superficie p-6">
          <h2 className="font-display text-lg font-semibold text-barro-900">Cancelamento</h2>
          <p className="mt-1 text-sm text-barro-600">Sem multa e sem precisar falar com ninguém.</p>
          <div className="mt-3">
            <BotaoCancelarAssinatura validoAte={assinatura.periodo_atual_fim} />
          </div>
        </section>
      )}

      <section className="mt-8 rounded-casca border border-barro-100 bg-superficie p-6">
        <h2 className="font-display text-lg font-semibold text-barro-900">Histórico de pagamentos</h2>
        {pagamentos.length === 0 ? (
          <p className="mt-2 text-sm text-barro-500">Nenhum pagamento registrado ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-barro-500">
                <tr>
                  <th scope="col" className="py-2 font-medium">Data</th>
                  <th scope="col" className="py-2 font-medium">Valor</th>
                  <th scope="col" className="py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-barro-100">
                {pagamentos.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{data(p.pago_em ?? p.criado_em)}</td>
                    <td className="py-2">{formatarCentavos(p.valor_centavos)}</td>
                    <td className="py-2">
                      <Selo tom={ROTULO_PAGAMENTO[p.status]?.tom ?? 'neutro'}>{ROTULO_PAGAMENTO[p.status]?.texto ?? p.status}</Selo>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-barro-500">
          Recibos e notas ficam na sua conta do Mercado Pago. Dúvidas? Veja a{' '}
          <Link href="/ajuda/planos-e-pagamentos" className="underline">
            ajuda sobre pagamentos
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
