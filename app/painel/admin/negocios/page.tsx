import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { ToggleDestaque } from '@/components/painel/toggle-destaque'
import { Selo } from '@/components/ui/selo'
import { Store } from 'lucide-react'
import Link from 'next/link'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { alternarVerificado } from '@/lib/actions/admin-gestao-actions'

export const dynamic = 'force-dynamic'

export default async function PainelNegocios({
  searchParams,
}: {
  searchParams: { busca?: string }
}) {
  await requireAdminOrRedirect()
  const supabase = createClient()

  let query = supabase
    .from('negocios')
    .select('id, nome, bairro, verificado, destaque_ativo, destaque_expira_em, categoria:categorias(nome)')
    .eq('status_cadastro', 'aprovado')
    .order('destaque_ativo', { ascending: false })
    .order('nome')
    .limit(200)

  if (searchParams.busca) {
    query = query.ilike('nome', `%${searchParams.busca}%`)
  }

  const { data: negocios, error } = await query
  if (error) console.error('Erro ao buscar negócios:', error.message)

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Negócios</h1>
      <p className="text-barro-600">
        Ative o destaque manualmente depois de confirmar o pagamento combinado pelo WhatsApp.
      </p>

      <form method="get" className="mt-4 max-w-sm">
        <input
          type="search"
          name="busca"
          defaultValue={searchParams.busca}
          placeholder="Buscar por nome..."
          className="w-full rounded-lg border border-barro-200 px-3 py-2 text-sm"
        />
      </form>

      {!negocios || negocios.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <Store className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhum negócio encontrado.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {negocios.map((n: any) => (
            <div
              key={n.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-casca border border-barro-100 bg-superficie p-4 shadow-feira"
            >
              <div>
                <Link href={`/negocio/${n.id}`} target="_blank" className="font-semibold text-barro-900 hover:underline">
                  {n.nome}
                </Link>
                <p className="text-sm text-barro-500">
                  {n.categoria?.nome} {n.bairro ? `· ${n.bairro}` : ''}
                </p>
                <Link href={`/painel/admin/negocios/${n.id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-mata-700 underline">
                  Editar dados
                </Link>
                {n.verificado && (
                  <span className="mt-1 inline-block">
                    <Selo tom="verde">Verificado</Selo>
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <ToggleDestaque negocioId={n.id} ativo={n.destaque_ativo} expiraEm={n.destaque_expira_em} />
                <FormularioAcao acao={alternarVerificado.bind(null, n.id)} rotuloBotao={n.verificado ? 'Atualizar' : 'Salvar'}>
                  <label className="flex items-center gap-2 text-sm text-barro-800">
                    <input type="checkbox" name="verificado" defaultChecked={n.verificado} /> Verificado (conferi documento/contato)
                  </label>
                  <input name="nota" maxLength={300} aria-label="Como foi verificado" placeholder="Como conferiu (interno)" className="mt-1 h-9 w-full rounded-lg border border-barro-200 px-2 text-sm" />
                </FormularioAcao>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
