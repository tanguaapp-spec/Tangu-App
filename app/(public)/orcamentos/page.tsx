import { exigirModulo } from '@/lib/config/ler'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Orçamentos', robots: { index: false } }
export const dynamic = 'force-dynamic'

const PASSOS = [
  { n: '1', t: 'Conte o que precisa', d: 'Ex.: “trocar 3 tomadas”, “bolo pra 30 pessoas”.' },
  { n: '2', t: 'Quem faz responde aqui', d: 'Com valor e prazo. Seu telefone não é mostrado.' },
  { n: '3', t: 'Você escolhe e chama', d: 'Fale no WhatsApp com quem preferir.' },
]

export default async function PaginaOrcamentos() {
  await exigirModulo('orcamentos')
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: pedidos } = user
    ? await supabase
        .from('pedidos_orcamento')
        .select('id, titulo, status, criado_em, expira_em, respostas:respostas_orcamento!respostas_orcamento_pedido_id_fkey(count)')
        .eq('solicitante_id', user.id)
        .order('criado_em', { ascending: false })
        .limit(50)
    : { data: null }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5 px-5 pb-8 pt-5 md:pt-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Orçamentos</h1>
        <p className="mt-1 text-sm text-barro-600 md:text-base">Peça uma vez e receba respostas de quem faz, aqui mesmo no app.</p>
      </div>

      <Link
        href={user ? '/orcamentos/novo' : '/entrar?next=/orcamentos/novo'}
        className="flex h-[52px] items-center justify-center rounded-2xl bg-laranja text-base font-bold text-tinta"
      >
        Pedir um orçamento
      </Link>

      {(!pedidos || pedidos.length === 0) && (
        <ol className="grid gap-2.5 md:grid-cols-3">
          {PASSOS.map((p) => (
            <li key={p.n} className="flex gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4 md:flex-col">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mata-100 font-mono font-bold text-mata-700">{p.n}</span>
              <span>
                <b className="block text-barro-900">{p.t}</b>
                <span className="text-sm text-barro-600">{p.d}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      {pedidos && pedidos.length > 0 && (
        <section aria-labelledby="t-pedidos" className="flex flex-col gap-2.5">
          <h2 id="t-pedidos" className="font-display text-lg font-bold text-barro-900">
            Seus pedidos
          </h2>
          {pedidos.map((p) => {
            const total = (p.respostas as unknown as { count: number }[])?.[0]?.count ?? 0
            const encerrado = p.status === 'encerrado' || new Date(p.expira_em) < new Date()
            return (
              <Link key={p.id} href={`/orcamentos/${p.id}`} className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-barro-900">{p.titulo}</b>
                  <span className="text-[13px] text-barro-600">
                    {new Date(p.criado_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    {encerrado && ' · encerrado'}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold',
                    total > 0 ? 'bg-mata-100 text-mata-700' : 'bg-barro-100 text-barro-700'
                  )}
                >
                  {total} {total === 1 ? 'resposta' : 'respostas'}
                </span>
                <ChevronRight className="h-[18px] w-[18px] text-barro-400" aria-hidden="true" />
              </Link>
            )
          })}
        </section>
      )}
    </div>
  )
}
