import { createServiceClient } from '@/lib/supabase/server'
import { salvarPlano } from '@/lib/actions/admin-config-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { CHAVES_LIMITE, CHAVES_RECURSO, ROTULO_LIMITE, ROTULO_RECURSO } from '@/lib/planos/limites'
import type { Plano } from '@/lib/queries/planos'

export const dynamic = 'force-dynamic'

const campo = 'w-full rounded-lg border border-barro-300 bg-superficie px-3 py-1.5 text-sm'

function FormPlano({ plano }: { plano?: Plano }) {
  const novo = !plano
  return (
    <FormularioAcao acao={salvarPlano} rotuloBotao={novo ? 'Criar plano' : 'Salvar plano'}>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="text-sm">
          <span className="text-barro-600">Identificador</span>
          {novo ? (
            <input name="id" required pattern="[a-z0-9_]{2,30}" className={campo} placeholder="ex.: premium" />
          ) : (
            <>
              <input type="hidden" name="id" value={plano.id} />
              <span className="block py-1.5 font-mono text-barro-800">{plano.id}</span>
            </>
          )}
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Nome</span>
          <input name="nome" required defaultValue={plano?.nome} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Preço mensal (R$)</span>
          <input name="preco" inputMode="decimal" defaultValue={plano ? (plano.preco_centavos / 100).toFixed(2).replace('.', ',') : ''} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Ordem</span>
          <input name="ordem" type="number" min={0} max={100} defaultValue={plano?.ordem ?? 10} className={campo} />
        </label>
        <label className="text-sm sm:col-span-4">
          <span className="text-barro-600">Descrição</span>
          <input name="descricao" maxLength={200} defaultValue={plano?.descricao ?? ''} className={campo} />
        </label>
        {CHAVES_LIMITE.map((chave) => (
          <label key={chave} className="text-sm">
            <span className="text-barro-600">{ROTULO_LIMITE[chave].curto}</span>
            <input
              name={chave}
              inputMode="numeric"
              placeholder="vazio = ilimitado"
              defaultValue={plano && plano.limites[chave] != null ? String(plano.limites[chave]) : ''}
              className={campo}
            />
          </label>
        ))}
        {CHAVES_RECURSO.map((chave) => (
          <label key={chave} className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name={chave} defaultChecked={!!plano?.recursos[chave]} />
            {ROTULO_RECURSO[chave]}
          </label>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ativo" defaultChecked={plano?.ativo ?? true} />
          Ativo (aparece pra contratação)
        </label>
        {!novo && (
          <label className="flex items-center gap-2 text-sm text-yellow-900 sm:col-span-3">
            <input type="checkbox" name="confirmo_preco" />
            Confirmo a mudança de preço, se houver (vale só pra novas contratações)
          </label>
        )}
      </div>
    </FormularioAcao>
  )
}

export default async function PaginaAdminPlanos() {
  const { data } = await createServiceClient().from('planos').select('*').order('ordem')
  const planos = (data ?? []) as Plano[]

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Planos e limites</h1>
      <p className="mt-1 text-barro-600">
        Os limites são aplicados pelo banco na hora em que o lojista tenta criar algo. Reduzir um limite não apaga nada: o
        que já existe fica, só não dá pra criar mais. Toda alteração fica na auditoria.
      </p>

      <div className="mt-6 space-y-6">
        {planos.map((p) => (
          <section key={p.id} className="rounded-casca border border-barro-100 bg-superficie p-5" aria-label={`Plano ${p.nome}`}>
            <h2 className="mb-3 font-display text-lg font-semibold text-barro-900">
              {p.nome} {!p.ativo && <span className="text-sm font-normal text-barro-500">(inativo)</span>}
            </h2>
            <FormPlano plano={p} />
          </section>
        ))}
        <section className="rounded-casca border border-dashed border-barro-300 bg-superficie p-5" aria-label="Novo plano">
          <h2 className="mb-3 font-display text-lg font-semibold text-barro-900">Novo plano</h2>
          <FormPlano />
        </section>
      </div>
    </div>
  )
}
