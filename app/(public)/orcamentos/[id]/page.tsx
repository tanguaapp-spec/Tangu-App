import { exigirModulo } from '@/lib/config/ler'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { encerrarPedidoOrcamento, escolherRespostaOrcamento } from '@/lib/actions/orcamento-actions'
import { formatarCentavos } from '@/lib/queries/planos'
import { linkWhatsapp } from '@/lib/utils'
import { Selo } from '@/components/ui/selo'
import { dataCurta } from '@/lib/datas'

export const metadata: Metadata = { title: 'Orçamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Resposta = {
  id: string
  mensagem: string
  valor_centavos: number | null
  prazo: string | null
  criado_em: string
  negocio: { id: string; nome: string; whatsapp: string | null } | null
}

export default async function PaginaPedido({ params, searchParams }: { params: { id: string }; searchParams: { enviado?: string } }) {
  await exigirModulo('orcamentos')
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/entrar?next=/orcamentos/${params.id}`)

  const { data: pedido } = await supabase
    .from('pedidos_orcamento')
    .select('*')
    .eq('id', params.id)
    .eq('solicitante_id', user.id)
    .maybeSingle()
  if (!pedido) notFound()

  const [{ data: respostas }, { data: destinatarios }] = await Promise.all([
    supabase
      .from('respostas_orcamento')
      .select('id, mensagem, valor_centavos, prazo, criado_em, negocio:negocios(id, nome, whatsapp)')
      .eq('pedido_id', pedido.id)
      .order('criado_em'),
    supabase.from('pedido_destinatarios').select('negocio_id, visto_em').eq('pedido_id', pedido.id),
  ])
  const vistos = (destinatarios ?? []).filter((d) => d.visto_em).length
  // o negócio fica sabendo que o morador leu a resposta
  const naoVistas = (respostas ?? []).map((r) => r.id)
  if (naoVistas.length) {
    await createServiceClient().from('respostas_orcamento').update({ vista_em: new Date().toISOString() }).in('id', naoVistas).is('vista_em', null)
  }
  const escolhida = (pedido as { resposta_escolhida_id?: string | null }).resposta_escolhida_id ?? null
  const aberto = pedido.status === 'aberto' && new Date(pedido.expira_em) > new Date()
  const encerrar = encerrarPedidoOrcamento.bind(null, pedido.id)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/orcamentos" className="text-sm font-medium text-barro-600 hover:text-casca-600">
        ← Meus orçamentos
      </Link>

      {searchParams.enviado && (
        <p role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-mata-50 p-3 text-sm text-mata-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Pedido enviado para {searchParams.enviado} negócio(s). Você recebe um aviso a cada resposta.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold text-barro-900">{pedido.titulo}</h1>
        <Selo tom={aberto ? 'verde' : 'neutro'}>{aberto ? 'Recebendo respostas' : 'Encerrado'}</Selo>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-barro-700">{pedido.descricao}</p>
      <p className="mt-2 text-xs text-barro-500">
        {pedido.bairro ? `${pedido.bairro} · ` : ''}enviado a {destinatarios?.length ?? 0} negócio(s), {vistos} já viram · aberto até{' '}
        {dataCurta(pedido.expira_em)}
      </p>

      <h2 className="mt-8 font-display text-lg font-semibold text-barro-900">Respostas</h2>
      {!respostas || respostas.length === 0 ? (
        <p className="mt-2 text-sm text-barro-500">Ainda sem respostas. Os negócios costumam responder em até 1 dia.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {(respostas as unknown as Resposta[]).map((r) => (
            <li key={r.id} className={`rounded-[20px] border bg-superficie p-4 ${escolhida === r.id ? 'border-serra ring-2 ring-mata-100' : 'border-barro-200/80'}`}>
              {escolhida === r.id && <p className="mb-1 text-xs font-bold uppercase text-mata-700">Você escolheu esta</p>}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/negocio/${r.negocio?.id}?origem=direto`} className="font-semibold text-barro-900 hover:underline">
                  {r.negocio?.nome}
                </Link>
                {r.valor_centavos !== null && <span className="font-semibold text-mata-700">{formatarCentavos(r.valor_centavos)}</span>}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-barro-700">{r.mensagem}</p>
              {r.prazo && <p className="mt-1 text-xs text-barro-500">Prazo: {r.prazo}</p>}
              {r.negocio?.whatsapp && (
                <a
                  href={linkWhatsapp(r.negocio.whatsapp, `Olá! Vi sua resposta ao meu pedido "${pedido.titulo}" no Tanguá App.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex h-11 items-center gap-2 rounded-[14px] bg-serra px-4 text-sm font-bold text-white"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Conversar no WhatsApp
                </a>
              )}
              {!escolhida && (
                <form
                  action={async () => {
                    'use server'
                    await escolherRespostaOrcamento(pedido.id, r.id)
                  }}
                  className="mt-2"
                >
                  <button className="text-sm font-semibold text-casca-700 underline underline-offset-4">Fechei com este negócio</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {aberto && (
        <form
          action={async () => {
            'use server'
            await encerrar()
          }}
          className="mt-8"
        >
          <button className="text-sm text-barro-600 underline hover:text-barro-900">Já resolvi — encerrar pedido</button>
        </form>
      )}
    </div>
  )
}
