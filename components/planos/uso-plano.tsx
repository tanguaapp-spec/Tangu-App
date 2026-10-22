import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CHAVES_LIMITE, ROTULO_LIMITE, formatarLimite, situacaoLimite, type UsoPlano } from '@/lib/planos/limites'

/** Consumo real do plano (vem de uso_plano() no banco) com aviso perto do limite. */
export function ResumoUsoPlano({ uso, nomePlano, compacto }: { uso: UsoPlano; nomePlano: string; compacto?: boolean }) {
  const cheios = CHAVES_LIMITE.filter((c) => situacaoLimite(uso.limites[c].uso, uso.limites[c].limite) !== 'livre')

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-barro-600">
          Plano atual: <span className="font-semibold text-barro-900">{nomePlano}</span>
        </p>
        {compacto && (
          <Link href="/painel/negocio/assinatura" className="text-sm font-semibold text-casca-700 hover:underline">
            Ver planos
          </Link>
        )}
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {CHAVES_LIMITE.map((chave) => {
          const { uso: usado, limite } = uso.limites[chave]
          const situacao = situacaoLimite(usado, limite)
          const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0
          return (
            <li key={chave}>
              <div className="flex justify-between text-sm">
                <span className="text-barro-700">{ROTULO_LIMITE[chave].curto}</span>
                <span className={cn('font-semibold', situacao === 'cheio' ? 'text-red-700' : 'text-barro-900')}>
                  {usado} / {formatarLimite(limite)}
                </span>
              </div>
              {limite !== null && (
                <div
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-barro-100"
                  role="progressbar"
                  aria-valuenow={usado}
                  aria-valuemin={0}
                  aria-valuemax={limite}
                  aria-label={ROTULO_LIMITE[chave].curto}
                >
                  <div
                    className={cn('h-full rounded-full', situacao === 'cheio' ? 'bg-red-500' : situacao === 'perto' ? 'bg-yellow-500' : 'bg-mata-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {cheios.length > 0 && (
        <p role="status" className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
          Você está {cheios.some((c) => situacaoLimite(uso.limites[c].uso, uso.limites[c].limite) === 'cheio') ? 'no' : 'perto do'} limite
          de {cheios.map((c) => ROTULO_LIMITE[c].frase).join(', ')}. Arquive o que não usa mais ou{' '}
          <Link href="/painel/negocio/assinatura" className="font-semibold underline">
            compare os planos
          </Link>
          .
        </p>
      )}
    </div>
  )
}
