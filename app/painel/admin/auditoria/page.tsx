import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const POR_PAGINA = 50

export default async function PaginaAuditoria({ searchParams }: { searchParams: { acao?: string; pagina?: string } }) {
  const pagina = Math.max(1, Number(searchParams.pagina) || 1)
  const filtroAcao = (searchParams.acao ?? '').replace(/[^a-z_.]/g, '').slice(0, 40)

  let consulta = createServiceClient()
    .from('registros_auditoria')
    .select('id, acao, entidade, entidade_id, dados, criado_em, ator:perfis!registros_auditoria_ator_id_fkey(nome_completo)', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
  if (filtroAcao) consulta = consulta.ilike('acao', `${filtroAcao}%`)

  const { data, count } = await consulta
  const total = count ?? 0
  const linhas = (data ?? []) as unknown as {
    id: string
    acao: string
    entidade: string | null
    entidade_id: string | null
    dados: unknown
    criado_em: string
    ator: { nome_completo: string } | null
  }[]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Auditoria</h1>
          <p className="text-barro-600">Ações administrativas, financeiras e de configuração. {total} registro(s).</p>
        </div>
        <a href={`/api/admin/auditoria.csv${filtroAcao ? `?acao=${filtroAcao}` : ''}`} className="rounded-lg border border-barro-300 px-3 py-1.5 text-sm font-medium hover:bg-barro-50">
          Exportar CSV
        </a>
      </div>

      <form className="mt-4 flex gap-2" role="search">
        <label htmlFor="acao" className="sr-only">
          Filtrar por ação
        </label>
        <input id="acao" name="acao" defaultValue={filtroAcao} placeholder="ex.: assinatura, plano, config, admin" className="rounded-lg border border-barro-300 px-3 py-1.5 text-sm" />
        <button className="rounded-lg bg-serra px-3 py-1.5 text-sm font-medium text-white">Filtrar</button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-barro-100 bg-superficie">
        <table className="w-full text-left text-sm">
          <thead className="bg-barro-50 text-barro-600">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Quando</th>
              <th scope="col" className="px-3 py-2 font-medium">Quem</th>
              <th scope="col" className="px-3 py-2 font-medium">Ação</th>
              <th scope="col" className="px-3 py-2 font-medium">Alvo</th>
              <th scope="col" className="px-3 py-2 font-medium">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-barro-100">
            {linhas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-barro-500">
                  Nenhum registro.
                </td>
              </tr>
            )}
            {linhas.map((l) => (
              <tr key={l.id} className="align-top">
                <td className="whitespace-nowrap px-3 py-2 text-barro-600">{new Date(l.criado_em).toLocaleString('pt-BR')}</td>
                <td className="px-3 py-2">{l.ator?.nome_completo ?? <span className="text-barro-400">sistema</span>}</td>
                <td className="px-3 py-2 font-mono text-xs">{l.acao}</td>
                <td className="px-3 py-2 text-xs text-barro-600">
                  {l.entidade} {l.entidade_id && <span className="font-mono">{l.entidade_id.slice(0, 12)}</span>}
                </td>
                <td className="max-w-md px-3 py-2">
                  <details>
                    <summary className="cursor-pointer text-xs text-casca-700">ver</summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all text-xs text-barro-700">{JSON.stringify(l.dados, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav aria-label="Paginação" className="mt-4 flex gap-3 text-sm">
        {pagina > 1 && <Link href={`?acao=${filtroAcao}&pagina=${pagina - 1}`}>← Anteriores</Link>}
        {pagina * POR_PAGINA < total && <Link href={`?acao=${filtroAcao}&pagina=${pagina + 1}`}>Próximos →</Link>}
      </nav>
    </div>
  )
}
