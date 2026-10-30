import type { Metadata } from 'next'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { TituloPainel } from '@/components/painel/titulo-painel'
import { dataCurta } from '@/lib/datas'

export const metadata: Metadata = { title: 'Pedidos de orçamento', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Linha = {
  visto_em: string | null
  criado_em: string
  pedido: { id: string; titulo: string; bairro: string | null; status: string; expira_em: string } | null
}

export default async function PaginaOrcamentosRecebidos() {
  const supabase = createClient()
  const { negocio } = await exigirNegocio('/painel/negocio/orcamentos')

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
      <TituloPainel titulo="Orçamentos" descricao="Moradores que pediram orçamento pra você. Responder rápido faz diferença: quem responde primeiro costuma fechar." voltar={null} />

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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-barro-200/80 bg-superficie p-4"
                >
                  <span>
                    <span className="flex items-center gap-2 font-semibold text-barro-900">
                      {!l.visto_em && <span className="h-2 w-2 rounded-full bg-casca-500" aria-label="Novo" />}
                      {p.titulo}
                    </span>
                    <span className="text-xs text-barro-500">
                      {p.bairro ? `${p.bairro} · ` : ''}
                      {dataCurta(l.criado_em)}
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
