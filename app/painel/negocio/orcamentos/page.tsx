import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'

export const metadata: Metadata = { title: 'Pedidos de orçamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Linha = {
  visto_em: string | null
  criado_em: string
  pedido: { id: string; titulo: string; bairro: string | null; status: string; expira_em: string } | null
}

export default async function PaginaOrcamentosRecebidos() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/painel/negocio/orcamentos')

  const { data: negocio } = await supabase.from('negocios').select('id').eq('reivindicado_por', user.id).maybeSingle()
  if (!negocio) redirect('/painel/negocio')

  const [{ data }, { data: respondidos }] = await Promise.all([
    supabase
      .from('pedido_destinatarios')
      .select('visto_em, criado_em, pedido:pedidos_orcamento(id, titulo, bairro, status, expira_em)')
      .eq('negocio_id', negocio.id)
      .order('criado_em', { ascending: false })
      .limit(100),
    supabase.from('respostas_orcamento').select('pedido_id').eq('negocio_id', negocio.id),
  ])
  const jaRespondi = new Set((respondidos ?? []).map((r) => r.pedido_id))
  const linhas = ((data ?? []) as unknown as Linha[]).filter((l) => l.pedido)

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/painel/negocio" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 hover:text-casca-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar pro painel
      </Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Pedidos de orçamento</h1>
      <p className="text-barro-600">Moradores que pediram orçamento pra você. Responder rápido faz diferença.</p>

      {linhas.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <Inbox className="mx-auto h-10 w-10 text-barro-300" aria-hidden="true" />
          <p className="mt-2">Nenhum pedido ainda. Perfis completos, com catálogo e fotos, recebem mais pedidos.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {linhas.map((l) => {
            const p = l.pedido!
            const aberto = p.status === 'aberto' && new Date(p.expira_em) > new Date()
            return (
              <li key={p.id}>
                <Link
                  href={`/painel/negocio/orcamentos/${p.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-barro-100 bg-white p-4 hover:border-casca-300"
                >
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-barro-900">
                      {!l.visto_em && <span className="h-2 w-2 rounded-full bg-casca-500" aria-label="Novo" />}
                      {p.titulo}
                    </span>
                    <span className="text-xs text-barro-500">
                      {p.bairro ? `${p.bairro} · ` : ''}
                      {new Date(l.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </span>
                  {jaRespondi.has(p.id) ? <Selo tom="verde">Respondido</Selo> : aberto ? <Selo tom="aviso">Aguardando você</Selo> : <Selo>Encerrado</Selo>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
