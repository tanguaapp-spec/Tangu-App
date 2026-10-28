import { createServiceClient } from '@/lib/supabase/server'
import { alternarRecursoPlano, salvarPlano } from '@/lib/actions/admin-config-actions'
import { InterruptorAcao } from '@/components/painel/admin/interruptor-acao'
import { formatarCentavos } from '@/lib/queries/planos'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { AJUDA_RECURSO, CHAVES_LIMITE, CHAVES_RECURSO, ROTULO_LIMITE, ROTULO_RECURSO, formatarLimite } from '@/lib/planos/limites'
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
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Planos e recursos</h1>
      <p className="mt-1 max-w-3xl text-barro-600">
        Toque no interruptor para dar ou tirar um recurso de um plano. Vale na hora para todos os negócios daquele plano. Os
        limites são conferidos pelo banco quando o lojista tenta criar algo; reduzir um limite não apaga nada. Toda mudança fica
        na auditoria.
      </p>

      <section aria-label="Recursos por plano" className="mt-6 overflow-x-auto rounded-casca border border-barro-100 bg-superficie">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-barro-100 bg-barro-50 text-left">
              <th className="p-3 font-semibold text-barro-700">Recurso</th>
              {planos.map((p) => (
                <th key={p.id} className="p-3 text-center font-semibold text-barro-900">
                  {p.nome}
                  <span className="block text-xs font-normal text-barro-600">
                    {p.preco_centavos ? `${formatarCentavos(p.preco_centavos)}/mês` : 'grátis'}
                    {!p.ativo && ' · fora da vitrine'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CHAVES_RECURSO.map((chave) => (
              <tr key={chave} className="border-b border-barro-100 last:border-0">
                <td className="p-3">
                  <b className="block text-barro-900">{ROTULO_RECURSO[chave]}</b>
                  <span className="text-xs text-barro-600">{AJUDA_RECURSO[chave]}</span>
                </td>
                {planos.map((p) => (
                  <td key={p.id} className="p-3 text-center">
                    <InterruptorAcao
                      ligado={p.recursos?.[chave] === true}
                      acao={alternarRecursoPlano}
                      campos={{ plano_id: p.id, recurso: chave }}
                      rotulo={`${ROTULO_RECURSO[chave]} no plano ${p.nome}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {CHAVES_LIMITE.map((chave) => (
              <tr key={chave} className="border-b border-barro-100 bg-barro-50/50 last:border-0">
                <td className="p-3 text-barro-700">{ROTULO_LIMITE[chave].curto}</td>
                {planos.map((p) => (
                  <td key={p.id} className="p-3 text-center font-mono text-barro-900">
                    {formatarLimite(p.limites?.[chave] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <h2 className="mt-10 font-display text-2xl font-semibold text-barro-900">Preço, nome e limites</h2>
      <div className="mt-4 space-y-6">
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
