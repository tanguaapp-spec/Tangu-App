import { createClient } from '@/lib/supabase/server'
import { AcoesReivindicacao } from '@/components/painel/acoes-reivindicacao'
import { ShieldCheck } from 'lucide-react'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export default async function PainelReivindicacoes() {
  await requireAdminOrRedirect()
  const supabase = createClient()
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes_reivindicacao')
    .select(
      '*, negocio:negocios(nome, endereco), solicitante:perfis!solicitacoes_reivindicacao_solicitante_id_fkey(nome_completo, telefone)'
    )
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Erro ao buscar reivindicações pendentes:', error.message)
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-barro-900">Reivindicações pendentes</h1>
      <p className="text-barro-600">Confirme se quem solicitou é mesmo o responsável pelo negócio.</p>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <ShieldCheck className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhuma solicitação pendente. Tudo em dia!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {solicitacoes.map((s: any) => (
            <div key={s.id} className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-barro-900">{s.negocio?.nome}</h3>
                  <p className="text-sm text-barro-500">{s.negocio?.endereco}</p>
                  <p className="mt-2 text-sm text-barro-700">
                    <span className="font-medium">Solicitante:</span> {s.solicitante?.nome_completo} ·{' '}
                    {s.solicitante?.telefone}
                  </p>
                  {s.mensagem && <p className="mt-1 text-sm text-barro-600 italic">&quot;{s.mensagem}&quot;</p>}
                </div>
                <AcoesReivindicacao solicitacaoId={s.id} negocioId={s.negocio_id} solicitanteId={s.solicitante_id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
