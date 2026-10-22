import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'

export const metadata: Metadata = { title: 'Meus orçamentos', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaMeusOrcamentos() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/orcamentos')

  const { data: pedidos } = await supabase
    .from('pedidos_orcamento')
    .select('id, titulo, status, criado_em, expira_em, respostas:respostas_orcamento(count)')
    .eq('solicitante_id', user.id)
    .order('criado_em', { ascending: false })
    .limit(50)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Meus orçamentos</h1>
          <p className="text-barro-600">Descreva o que precisa e receba respostas de quem faz, aqui mesmo no app.</p>
        </div>
        <Link href="/orcamentos/novo" className="rounded-lg bg-laranja px-3 py-1.5 text-sm font-semibold text-tinta hover:bg-laranja-claro">
          Pedir orçamento
        </Link>
      </div>

      {!pedidos || pedidos.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <FileText className="mx-auto h-10 w-10 text-barro-300" aria-hidden="true" />
          <p className="mt-2">Você ainda não pediu orçamento.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {pedidos.map((p) => {
            const total = (p.respostas as unknown as { count: number }[])?.[0]?.count ?? 0
            const expirado = new Date(p.expira_em) < new Date()
            return (
              <li key={p.id}>
                <Link href={`/orcamentos/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-barro-100 bg-superficie p-4 hover:border-casca-300">
                  <span>
                    <span className="block font-semibold text-barro-900">{p.titulo}</span>
                    <span className="text-xs text-barro-500">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Selo tom={total > 0 ? 'verde' : 'neutro'}>
                      {total} {total === 1 ? 'resposta' : 'respostas'}
                    </Selo>
                    {(p.status === 'encerrado' || expirado) && <Selo>Encerrado</Selo>}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
