import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react'
import { progressoChecklist, type ItemChecklist } from '@/lib/onboarding/checklist-negocio'

/** Some sozinho quando o perfil chega a 100%. Não bloqueia nada do painel. */
export function ChecklistNegocio({ itens, urlPublica }: { itens: ItemChecklist[]; urlPublica: string }) {
  const { percentual, proximo, pendentes } = progressoChecklist(itens)
  if (!proximo) return null

  return (
    <section aria-labelledby="titulo-checklist" className="mt-6 rounded-casca border border-casca-200 bg-white p-6 shadow-feira">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-checklist" className="font-display text-lg font-semibold text-barro-900">
          Seu perfil está {percentual}% pronto
        </h2>
        <a href={urlPublica} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-casca-700 hover:underline">
          Ver como o cliente vê
        </a>
      </div>
      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-barro-100"
        role="progressbar"
        aria-valuenow={percentual}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Conclusão do perfil"
      >
        <div className="h-full rounded-full bg-mata-500 transition-all" style={{ width: `${percentual}%` }} />
      </div>

      <Link href={proximo.href} className="mt-4 flex items-start gap-3 rounded-xl bg-casca-50 p-4 hover:bg-casca-100">
        <ArrowRight className="mt-0.5 h-5 w-5 shrink-0 text-casca-700" aria-hidden="true" />
        <span>
          <span className="block font-semibold text-barro-900">Próximo passo: {proximo.titulo}</span>
          <span className="block text-sm text-barro-700">{proximo.beneficio}</span>
        </span>
      </Link>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-barro-600">
          Ver todas as etapas ({itens.length - pendentes.length}/{itens.length} concluídas)
        </summary>
        <ul className="mt-2 space-y-1.5">
          {itens.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center gap-2 text-sm hover:underline">
                {item.feito ? (
                  <CheckCircle2 className="h-4 w-4 text-mata-600" aria-label="Concluído" />
                ) : (
                  <Circle className="h-4 w-4 text-barro-300" aria-label="Pendente" />
                )}
                <span className={item.feito ? 'text-barro-500 line-through' : 'text-barro-800'}>{item.titulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
