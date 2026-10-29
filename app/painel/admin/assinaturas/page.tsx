import { createServiceClient } from '@/lib/supabase/server'
import { formatarCentavos } from '@/lib/queries/planos'
import { Selo } from '@/components/ui/selo'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'

export const dynamic = 'force-dynamic'

const TOM: Record<string, 'verde' | 'aviso' | 'neutro' | 'laranja'> = {
  ativa: 'verde',
  aprovado: 'verde',
  processado: 'verde',
  pendente: 'aviso',
  em_processo: 'aviso',
  recebido: 'aviso',
  em_atraso: 'laranja',
  recusado: 'laranja',
  falhou: 'laranja',
}

function data(iso: string | null) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—'
}

export default async function PaginaAdminAssinaturas() {
  const db = createServiceClient()
  const [{ data: assinaturas }, { data: pagamentos }, { data: webhooks }] = await Promise.all([
    db
      .from('assinaturas')
      .select('id, plano_id, status, valor_centavos, periodo_atual_fim, tolerancia_ate, criado_em, negocio:negocios(nome)')
      .order('criado_em', { ascending: false })
      .limit(100),
    db
      .from('pagamentos')
      .select('id, status, valor_centavos, pago_em, criado_em, provedor_pagamento_id, negocio:negocios(nome)')
      .order('criado_em', { ascending: false })
      .limit(100),
    db
      .from('eventos_webhook')
      .select('id, tipo, recurso_id, status, assinatura_valida, tentativas, erro, recebido_em')
      .order('recebido_em', { ascending: false })
      .limit(50),
  ])

  type ComNegocio = { negocio: { nome: string } | null }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Assinaturas e pagamentos</h1>
        <p className="text-barro-600">
          Situação vem do Mercado Pago, confirmada pelo servidor. Este painel é só leitura — mudanças acontecem pelo
          próprio lojista ou pelo provedor de pagamento.
        </p>
        <GuiaPagina chave="assinaturas" />
      </div>

      <section aria-labelledby="t-assinaturas">
        <h2 id="t-assinaturas" className="font-display text-lg font-semibold text-barro-900">
          Assinaturas (últimas 100)
        </h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-barro-100 bg-superficie">
          <table className="w-full text-left text-sm">
            <thead className="bg-barro-50 text-barro-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Negócio</th>
                <th scope="col" className="px-3 py-2 font-medium">Plano</th>
                <th scope="col" className="px-3 py-2 font-medium">Situação</th>
                <th scope="col" className="px-3 py-2 font-medium">Valor</th>
                <th scope="col" className="px-3 py-2 font-medium">Vale até</th>
                <th scope="col" className="px-3 py-2 font-medium">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-barro-100">
              {(assinaturas ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-barro-500">
                    Nenhuma assinatura ainda.
                  </td>
                </tr>
              )}
              {(assinaturas ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2">{(a as unknown as ComNegocio).negocio?.nome ?? '—'}</td>
                  <td className="px-3 py-2">{a.plano_id}</td>
                  <td className="px-3 py-2">
                    <Selo tom={TOM[a.status] ?? 'neutro'}>{a.status.replace('_', ' ')}</Selo>
                  </td>
                  <td className="px-3 py-2">{formatarCentavos(a.valor_centavos)}</td>
                  <td className="px-3 py-2">{a.status === 'em_atraso' ? data(a.tolerancia_ate) : data(a.periodo_atual_fim)}</td>
                  <td className="px-3 py-2 text-barro-500">{data(a.criado_em)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="t-pagamentos">
        <h2 id="t-pagamentos" className="font-display text-lg font-semibold text-barro-900">
          Pagamentos (últimos 100)
        </h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-barro-100 bg-superficie">
          <table className="w-full text-left text-sm">
            <thead className="bg-barro-50 text-barro-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Negócio</th>
                <th scope="col" className="px-3 py-2 font-medium">Valor</th>
                <th scope="col" className="px-3 py-2 font-medium">Situação</th>
                <th scope="col" className="px-3 py-2 font-medium">Pago em</th>
                <th scope="col" className="px-3 py-2 font-medium">ID Mercado Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-barro-100">
              {(pagamentos ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-barro-500">
                    Nenhum pagamento ainda.
                  </td>
                </tr>
              )}
              {(pagamentos ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2">{(p as unknown as ComNegocio).negocio?.nome ?? '—'}</td>
                  <td className="px-3 py-2">{formatarCentavos(p.valor_centavos)}</td>
                  <td className="px-3 py-2">
                    <Selo tom={TOM[p.status] ?? 'neutro'}>{p.status.replace('_', ' ')}</Selo>
                  </td>
                  <td className="px-3 py-2">{data(p.pago_em)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.provedor_pagamento_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="webhooks" aria-labelledby="t-webhooks">
        <h2 id="t-webhooks" className="font-display text-lg font-semibold text-barro-900">
          Webhooks recebidos (últimos 50)
        </h2>
        <p className="text-sm text-barro-500">Falhas são reprocessadas pelo cron diário (até 5 tentativas). Assinatura inválida = ignorado e registrado.</p>
        <div className="mt-2 overflow-x-auto rounded-xl border border-barro-100 bg-superficie">
          <table className="w-full text-left text-sm">
            <thead className="bg-barro-50 text-barro-600">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Recebido</th>
                <th scope="col" className="px-3 py-2 font-medium">Tipo</th>
                <th scope="col" className="px-3 py-2 font-medium">Situação</th>
                <th scope="col" className="px-3 py-2 font-medium">Assinatura HMAC</th>
                <th scope="col" className="px-3 py-2 font-medium">Erro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-barro-100">
              {(webhooks ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-barro-500">
                    Nenhum webhook recebido ainda.
                  </td>
                </tr>
              )}
              {(webhooks ?? []).map((w) => (
                <tr key={w.id}>
                  <td className="whitespace-nowrap px-3 py-2">{data(w.recebido_em)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{w.tipo}</td>
                  <td className="px-3 py-2">
                    <Selo tom={TOM[w.status] ?? 'neutro'}>
                      {w.status} {w.tentativas > 1 ? `(${w.tentativas}x)` : ''}
                    </Selo>
                  </td>
                  <td className="px-3 py-2">{w.assinatura_valida ? 'válida' : <span className="font-semibold text-red-700">inválida</span>}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-xs text-barro-500" title={w.erro ?? ''}>
                    {w.erro}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
