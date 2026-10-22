import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHAVES_LIMITE, CHAVES_RECURSO, ROTULO_LIMITE, ROTULO_RECURSO, formatarLimite } from '@/lib/planos/limites'
import { formatarCentavos, type Plano } from '@/lib/queries/planos'

/**
 * Comparação transparente dos planos — os números vêm da tabela `planos`
 * (os mesmos que o banco usa pra aplicar os limites), nunca de texto fixo.
 * `acao` renderiza o botão de cada plano (página pública ≠ painel).
 */
export function TabelaPlanos({
  planos,
  planoAtual,
  acao,
}: {
  planos: Plano[]
  planoAtual?: string | null
  acao: (plano: Plano) => React.ReactNode
}) {
  if (planos.length === 0) {
    return <p className="rounded-xl bg-barro-50 p-4 text-sm text-barro-600">Os planos não puderam ser carregados agora. Tente recarregar a página.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {planos.map((plano) => {
        const atual = plano.id === planoAtual
        const destaque = plano.recursos.destaque_busca
        return (
          <section
            key={plano.id}
            aria-labelledby={`plano-${plano.id}`}
            className={cn(
              'flex flex-col rounded-casca border bg-superficie p-6 shadow-feira',
              atual ? 'border-mata-500 ring-2 ring-mata-200' : destaque ? 'border-casca-300' : 'border-barro-100'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 id={`plano-${plano.id}`} className="font-display text-xl font-semibold text-barro-900">
                {plano.nome}
              </h3>
              {atual && <span className="rounded-full bg-mata-100 px-2.5 py-1 text-xs font-semibold text-mata-700">Seu plano</span>}
            </div>
            <p className="mt-2">
              <span className="text-3xl font-bold text-barro-900">
                {plano.preco_centavos === 0 ? 'Grátis' : formatarCentavos(plano.preco_centavos)}
              </span>
              {plano.preco_centavos > 0 && <span className="text-sm text-barro-500"> /mês</span>}
            </p>
            {plano.descricao && <p className="mt-2 text-sm text-barro-600">{plano.descricao}</p>}

            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {CHAVES_LIMITE.map((chave) => (
                <li key={chave} className="flex items-start justify-between gap-3">
                  <span className="text-barro-600">{ROTULO_LIMITE[chave].curto}</span>
                  <span className="shrink-0 font-semibold text-barro-900">
                    {formatarLimite(chave in plano.limites ? plano.limites[chave] ?? null : null)}
                  </span>
                </li>
              ))}
              {CHAVES_RECURSO.map((chave) => (
                <li key={chave} className="flex items-start gap-2">
                  {plano.recursos[chave] ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-mata-600" aria-label="Incluído" />
                  ) : (
                    <Minus className="mt-0.5 h-4 w-4 shrink-0 text-barro-300" aria-label="Não incluído" />
                  )}
                  <span className={plano.recursos[chave] ? 'text-barro-800' : 'text-barro-400'}>{ROTULO_RECURSO[chave]}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">{acao(plano)}</div>
          </section>
        )
      })}
    </div>
  )
}
