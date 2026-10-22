import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'
import { CATEGORIAS_CHAMADO, STATUS_CHAMADO, type CategoriaChamado } from '@/lib/ajuda/chamados'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const FILTROS = [
  ['pendentes', 'Precisam de resposta'],
  ['todos', 'Todos'],
  ['resolvidos', 'Resolvidos/fechados'],
] as const

export default async function PaginaAdminSuporte({ searchParams }: { searchParams: { filtro?: string } }) {
  const filtro = FILTROS.some(([f]) => f === searchParams.filtro) ? searchParams.filtro! : 'pendentes'
  let consulta = createServiceClient()
    .from('chamados_suporte')
    .select('id, categoria, assunto, status, atualizado_em, perfil:perfis!chamados_suporte_perfil_id_fkey(nome_completo)')
    .order('atualizado_em', { ascending: filtro === 'pendentes' })
    .limit(100)
  if (filtro === 'pendentes') consulta = consulta.in('status', ['aberto', 'escalado'])
  if (filtro === 'resolvidos') consulta = consulta.in('status', ['resolvido', 'fechado'])
  const { data } = await consulta
  const chamados = (data ?? []) as unknown as {
    id: string
    categoria: string
    assunto: string
    status: string
    atualizado_em: string
    perfil: { nome_completo: string } | null
  }[]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Chamados de suporte</h1>
      <p className="text-barro-600">Os mais antigos sem resposta aparecem primeiro.</p>

      <nav aria-label="Filtro" className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map(([f, rotulo]) => (
          <Link
            key={f}
            href={`?filtro=${f}`}
            aria-current={f === filtro ? 'page' : undefined}
            className={cn('rounded-full px-3 py-1 text-sm font-medium', f === filtro ? 'bg-casca-100 text-casca-800' : 'bg-white text-barro-600')}
          >
            {rotulo}
          </Link>
        ))}
      </nav>

      {chamados.length === 0 ? (
        <p className="mt-8 text-center text-barro-500">Nenhum chamado aqui. 🎉</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {chamados.map((c) => (
            <li key={c.id}>
              <Link
                href={`/painel/admin/suporte/${c.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-barro-100 bg-white p-4 hover:border-casca-300"
              >
                <span>
                  <span className="block font-semibold text-barro-900">{c.assunto}</span>
                  <span className="text-xs text-barro-500">
                    {c.perfil?.nome_completo ?? 'conta excluída'} · {CATEGORIAS_CHAMADO[c.categoria as CategoriaChamado]} ·{' '}
                    {new Date(c.atualizado_em).toLocaleString('pt-BR')}
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
