import { createClient } from '@/lib/supabase/server'
import { FormularioCriarVaga } from '@/components/painel/formulario-criar-vaga'
import { BotaoEncerrarVaga } from '@/components/painel/botao-encerrar-vaga'
import { Selo } from '@/components/ui/selo'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export default async function PainelVagas() {
  await requireAdminOrRedirect()
  const supabase = createClient()
  const { data: vagas } = await supabase
    .from('vagas')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="font-display text-3xl font-medium text-barro-900">Vagas de emprego</h1>
      <p className="text-barro-600">Publique vagas solicitadas por empresas e comércios da cidade.</p>

      <div className="mt-6 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Nova vaga</h2>
        <div className="mt-4">
          <FormularioCriarVaga />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-barro-900">Todas as vagas</h2>
        <div className="mt-3 space-y-2">
          {vagas?.map((v) => (
            <div key={v.id} className="flex items-center justify-between rounded-xl border border-barro-100 bg-white p-4">
              <div>
                <p className="font-medium text-barro-900">{v.titulo}</p>
                <p className="text-sm text-barro-500">{v.empresa_nome}</p>
              </div>
              <div className="flex items-center gap-3">
                <Selo tom={v.status === 'aberta' ? 'verde' : 'neutro'}>{v.status}</Selo>
                {v.status === 'aberta' && <BotaoEncerrarVaga vagaId={v.id} />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
