import { createClient } from '@/lib/supabase/server'
import { AcoesNegocioPendente } from '@/components/painel/acoes-negocio-pendente'
import { Store } from 'lucide-react'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export default async function PainelNegociosPendentes() {
  await requireAdminOrRedirect()
  const supabase = createClient()
  const { data: negocios, error } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(nome), dono:perfis!negocios_reivindicado_por_fkey(nome_completo, telefone)')
    .eq('status_cadastro', 'pendente')
    .order('criado_em', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Erro ao buscar cadastros pendentes:', error.message)
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-barro-900">Cadastros pendentes</h1>
      <p className="text-barro-600">Negócios cadastrados diretamente por profissionais, aguardando revisão.</p>

      {!negocios || negocios.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <Store className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhum cadastro pendente. Tudo em dia!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {negocios.map((n: any) => (
            <div key={n.id} className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-barro-900">{n.nome}</h3>
                  <p className="text-sm text-barro-500">
                    {n.categoria?.nome} {n.bairro ? `· ${n.bairro}` : ''}
                  </p>
                  {n.descricao && <p className="mt-1 text-sm text-barro-600">{n.descricao}</p>}
                  <p className="mt-2 text-sm text-barro-700">
                    <span className="font-medium">Cadastrado por:</span> {n.dono?.nome_completo} ·{' '}
                    {n.dono?.telefone || n.whatsapp}
                  </p>
                </div>
                <AcoesNegocioPendente negocioId={n.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
