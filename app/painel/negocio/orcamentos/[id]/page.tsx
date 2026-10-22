import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { marcarPedidoVisto, responderPedidoOrcamento } from '@/lib/actions/orcamento-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { formatarCentavos } from '@/lib/queries/planos'

export const metadata: Metadata = { title: 'Pedido de orçamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaPedidoRecebido({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/entrar?next=/painel/negocio/orcamentos/${params.id}`)

  // RLS: só aparece se este negócio for destinatário
  const { data: pedido } = await supabase
    .from('pedidos_orcamento')
    .select('id, titulo, descricao, bairro, status, criado_em, expira_em, solicitante_id')
    .eq('id', params.id)
    .maybeSingle()
  if (!pedido) notFound()

  const { data: negocio } = await supabase.from('negocios').select('id').eq('reivindicado_por', user.id).maybeSingle()
  const [{ data: minhas }, { data: solicitante }] = await Promise.all([
    supabase
      .from('respostas_orcamento')
      .select('id, mensagem, valor_centavos, prazo, criado_em')
      .eq('pedido_id', pedido.id)
      .eq('negocio_id', negocio?.id ?? '')
      .order('criado_em'),
    // só o primeiro nome — contato do morador nunca é exposto ao negócio
    createServiceClient().from('perfis').select('nome_completo').eq('id', pedido.solicitante_id ?? '').maybeSingle(),
  ])
  await marcarPedidoVisto(pedido.id)

  const primeiroNome = solicitante?.nome_completo?.split(' ')[0] ?? 'Morador'
  const aberto = pedido.status === 'aberto' && new Date(pedido.expira_em) > new Date()
  const responder = responderPedidoOrcamento.bind(null, pedido.id)

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/painel/negocio/orcamentos" className="text-sm font-medium text-barro-600 hover:text-casca-600">
        ← Pedidos de orçamento
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold text-barro-900">{pedido.titulo}</h1>
      <p className="text-sm text-barro-500">
        {primeiroNome}
        {pedido.bairro ? ` · ${pedido.bairro}` : ''} · {new Date(pedido.criado_em).toLocaleDateString('pt-BR')}
      </p>
      <p className="mt-4 whitespace-pre-wrap rounded-xl bg-white p-4 text-barro-800">{pedido.descricao}</p>

      {(minhas ?? []).length > 0 && (
        <section className="mt-6" aria-label="Suas respostas">
          <h2 className="font-semibold text-barro-900">Suas respostas</h2>
          <ul className="mt-2 space-y-2">
            {(minhas ?? []).map((r) => (
              <li key={r.id} className="rounded-xl bg-mata-50 p-3 text-sm text-mata-900">
                <p className="whitespace-pre-wrap">{r.mensagem}</p>
                <p className="mt-1 text-xs">
                  {r.valor_centavos !== null && `${formatarCentavos(r.valor_centavos)} · `}
                  {r.prazo && `${r.prazo} · `}
                  {new Date(r.criado_em).toLocaleString('pt-BR')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aberto ? (
        <section className="mt-6 rounded-casca border border-barro-100 bg-white p-5" aria-label="Responder">
          <FormularioAcao acao={responder} rotuloBotao="Enviar resposta">
            <label htmlFor="mensagem" className="text-sm font-medium text-barro-800">
              Sua resposta
            </label>
            <textarea id="mensagem" name="mensagem" required rows={4} maxLength={2000} className="mt-1 w-full rounded-xl border border-barro-300 px-3 py-2 text-sm" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="font-medium text-barro-800">Valor (opcional)</span>
                <input name="valor" inputMode="decimal" placeholder="Ex.: 450,00" className="mt-1 w-full rounded-lg border border-barro-300 px-3 py-1.5" />
              </label>
              <label className="text-sm">
                <span className="font-medium text-barro-800">Prazo (opcional)</span>
                <input name="prazo" maxLength={100} placeholder="Ex.: 2 dias" className="mt-1 w-full rounded-lg border border-barro-300 px-3 py-1.5" />
              </label>
            </div>
            <p className="mt-2 text-xs text-barro-500">O morador vê sua resposta e pode te chamar no WhatsApp do seu perfil.</p>
          </FormularioAcao>
        </section>
      ) : (
        <p className="mt-6 text-sm text-barro-500">Este pedido foi encerrado e não recebe mais respostas.</p>
      )}
    </div>
  )
}
