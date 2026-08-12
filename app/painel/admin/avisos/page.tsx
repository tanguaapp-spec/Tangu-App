import { createClient } from '@/lib/supabase/server'
import { FormularioCriarAviso } from '@/components/painel/formulario-criar-aviso'
import { BotaoRemoverAviso } from '@/components/painel/botao-remover-aviso'
import { Selo } from '@/components/ui/selo'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export default async function PainelAvisos() {
  await requireAdminOrRedirect()
  const supabase = createClient()
  const { data: avisos } = await supabase
    .from('avisos_cidade')
    .select('*')
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(50)

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Mural da cidade</h1>
      <p className="text-barro-600">Publique avisos, eventos e utilidade pública para Tanguá.</p>

      <div className="mt-6 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Novo aviso</h2>
        <div className="mt-4">
          <FormularioCriarAviso />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-barro-900">Avisos publicados</h2>
        <div className="mt-3 space-y-2">
          {avisos?.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-barro-100 bg-white p-4">
              <div>
                <p className="font-medium text-barro-900">{a.titulo}</p>
                <p className="text-sm text-barro-500">{a.tipo}</p>
              </div>
              <div className="flex items-center gap-3">
                {a.fixado && <Selo tom="aviso">Fixado</Selo>}
                <BotaoRemoverAviso avisoId={a.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
