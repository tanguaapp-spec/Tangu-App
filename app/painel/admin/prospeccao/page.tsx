import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { SincronizarProspeccao } from '@/components/painel/sincronizar-prospeccao'
import { LinhaProspeccao } from '@/components/painel/linha-prospeccao'
import { Radar, Info } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const FILTROS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'faltando', rotulo: 'Ainda não estão no app' },
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'contactado', rotulo: 'Contactado' },
  { valor: 'convidado', rotulo: 'Convidado' },
  { valor: 'convertido', rotulo: 'Convertido' },
  { valor: 'ignorado', rotulo: 'Ignorado' },
]

export default async function PainelProspeccao({
  searchParams,
}: {
  searchParams: { filtro?: string }
}) {
  await requireAdminOrRedirect()
  const supabase = createClient()
  const filtro = searchParams.filtro ?? 'faltando'

  let query = supabase.from('prospeccoes_negocios').select('*').order('nome')

  if (filtro === 'faltando') query = query.is('negocio_vinculado_id', null)
  else if (filtro !== 'todos') query = query.eq('status', filtro)

  const { data: prospeccoes, error } = await query.limit(300)
  if (error) console.error('Erro ao buscar prospecções:', error.message)

  const { count: total } = await supabase.from('prospeccoes_negocios').select('*', { count: 'exact', head: true })
  const { count: faltando } = await supabase
    .from('prospeccoes_negocios')
    .select('*', { count: 'exact', head: true })
    .is('negocio_vinculado_id', null)

  return (
    <div>
      <div className="flex items-center gap-2">
        <Radar className="h-6 w-6 text-barro-700" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Prospecção</h1>
      </div>
      <p className="text-barro-600">
        Lista privada — nunca aparece pro público. Sincronize com o Google Maps pra ver quem em Tanguá ainda não tem
        perfil no app e chamar no WhatsApp.
      </p>

      <div className="mt-3 flex items-start gap-2 rounded-lg bg-barro-50 p-3 text-sm text-barro-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-barro-400" />
        <p>
          A Google Places API não fornece e-mail — só telefone e site, quando o próprio estabelecimento os deixou
          públicos no Maps. O link do WhatsApp já vem com o número, se houver.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <SincronizarProspeccao />
        <p className="text-sm text-barro-500">
          {total ?? 0} sincronizados no total · {faltando ?? 0} ainda fora do app
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={`/painel/admin/prospeccao?filtro=${f.valor}`}
            className={`rounded-full border px-3 py-1 text-sm ${
              filtro === f.valor
                ? 'border-casca-500 bg-casca-50 text-casca-700'
                : 'border-barro-200 text-barro-600 hover:bg-barro-50'
            }`}
          >
            {f.rotulo}
          </Link>
        ))}
      </div>

      {!prospeccoes || prospeccoes.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <Radar className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhum resultado ainda — clique em &ldquo;Sincronizar&rdquo; acima.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {prospeccoes.map((p: any) => (
            <LinhaProspeccao key={p.id} prospeccao={p} />
          ))}
        </div>
      )}
    </div>
  )
}
