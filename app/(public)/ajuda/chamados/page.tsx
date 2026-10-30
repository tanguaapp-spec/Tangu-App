import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'
import { CATEGORIAS_CHAMADO, STATUS_CHAMADO, type CategoriaChamado } from '@/lib/ajuda/chamados'
import { dataHora } from '@/lib/datas'

export const metadata: Metadata = { title: 'Meus chamados', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaMeusChamados() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/ajuda/chamados')

  const { data: chamados } = await supabase
    .from('chamados_suporte')
    .select('id, categoria, assunto, status, atualizado_em')
    .eq('perfil_id', user.id)
    .order('atualizado_em', { ascending: false })
    .limit(50)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Meus chamados</h1>
        <Link href="/ajuda/contato" className="rounded-lg bg-laranja px-3 py-1.5 text-sm font-semibold text-tinta hover:bg-laranja-claro">
          Novo chamado
        </Link>
      </div>

      {!chamados || chamados.length === 0 ? (
        <p className="mt-8 rounded-xl bg-superficie p-6 text-center text-barro-600">
          Você ainda não abriu nenhum chamado.{' '}
          <Link href="/ajuda" className="font-semibold text-casca-700 underline">
            Veja a central de ajuda
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {chamados.map((c) => (
            <li key={c.id}>
              <Link href={`/ajuda/chamados/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-barro-100 bg-superficie p-4 hover:border-casca-300">
                <span>
                  <span className="block font-semibold text-barro-900">{c.assunto}</span>
                  <span className="text-xs text-barro-500">
                    {CATEGORIAS_CHAMADO[c.categoria as CategoriaChamado]} · atualizado {dataHora(c.atualizado_em)}
                  </span>
                </span>
                <Selo tom={STATUS_CHAMADO[c.status]?.tom ?? 'neutro'}>{STATUS_CHAMADO[c.status]?.rotulo ?? c.status}</Selo>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
