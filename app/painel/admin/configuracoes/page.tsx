import { createServiceClient } from '@/lib/supabase/server'
import { salvarConfiguracao } from '@/lib/actions/admin-config-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { DEFINICOES_CONFIG, type ChaveConfig } from '@/lib/admin/configuracoes'

export const dynamic = 'force-dynamic'

function valorParaTexto(tipo: string, valor: unknown) {
  if (tipo === 'lista') return Array.isArray(valor) ? valor.join('\n') : ''
  if (valor === null || valor === undefined) return ''
  return String(valor)
}

export default async function PaginaAdminConfiguracoes() {
  const { data } = await createServiceClient().from('configuracoes_sistema').select('chave, valor, atualizado_em')
  const atuais = new Map((data ?? []).map((c) => [c.chave, c]))

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Configurações</h1>
      <p className="mt-1 text-barro-600">Regras globais do app. Cada alteração fica registrada na auditoria.</p>

      <div className="mt-6 space-y-4">
        {(Object.keys(DEFINICOES_CONFIG) as ChaveConfig[]).map((chave) => {
          const def = DEFINICOES_CONFIG[chave]
          const atual = atuais.get(chave)
          return (
            <section key={chave} className="rounded-casca border border-barro-100 bg-white p-5" aria-label={def.rotulo}>
              <FormularioAcao acao={salvarConfiguracao}>
                <input type="hidden" name="chave" value={chave} />
                <label htmlFor={`cfg-${chave}`} className="font-semibold text-barro-900">
                  {def.rotulo}
                </label>
                <p className="text-sm text-barro-500">{def.ajuda}</p>
                {!atual ? (
                  <p className="mt-2 text-sm text-red-600">Chave ausente no banco — aplique a migration 0017.</p>
                ) : def.tipo === 'booleano' ? (
                  <select id={`cfg-${chave}`} name="valor" defaultValue={String(atual.valor)} className="mt-2 rounded-lg border border-barro-300 px-3 py-1.5 text-sm">
                    <option value="false">Desligado</option>
                    <option value="true">Ligado</option>
                  </select>
                ) : def.tipo === 'lista' ? (
                  <textarea
                    id={`cfg-${chave}`}
                    name="valor"
                    rows={4}
                    defaultValue={valorParaTexto(def.tipo, atual.valor)}
                    className="mt-2 w-full rounded-lg border border-barro-300 px-3 py-1.5 text-sm"
                  />
                ) : (
                  <input
                    id={`cfg-${chave}`}
                    name="valor"
                    inputMode={def.tipo === 'inteiro' ? 'numeric' : undefined}
                    defaultValue={valorParaTexto(def.tipo, atual.valor)}
                    className="mt-2 w-full max-w-sm rounded-lg border border-barro-300 px-3 py-1.5 text-sm"
                  />
                )}
                {atual && <p className="mt-1 text-xs text-barro-400">Alterado em {new Date(atual.atualizado_em).toLocaleString('pt-BR')}</p>}
              </FormularioAcao>
            </section>
          )
        })}
      </div>
    </div>
  )
}
