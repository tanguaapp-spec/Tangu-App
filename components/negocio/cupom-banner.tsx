import { Zap } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatarPrecoBRL } from '@/lib/utils'
import { percentualDesconto } from '@/lib/ofertas/desconto'
import { BotaoPegarCupom } from '@/components/negocio/botao-pegar-cupom'
import type { Cupom } from '@/lib/types/database'

export function CupomBanner({ cupom, logado, codigoExistente }: { cupom: Cupom; logado: boolean; codigoExistente?: string | null }) {
  const pct = percentualDesconto(cupom.preco_original_centavos, cupom.preco_promocional_centavos)
  const restantes = cupom.limite_resgates ? Math.max(0, cupom.limite_resgates - (cupom.resgates_count ?? 0)) : null

  return (
    <div className="mt-4 rounded-xl border border-casca-300 bg-casca-50 px-4 py-3">
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 h-5 w-5 shrink-0 text-casca-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-casca-800">
            {cupom.titulo} — {cupom.desconto_texto}
            {pct !== null && <span className="ml-2 rounded-full bg-casca-700 px-2 py-0.5 text-xs font-bold text-white">-{pct}%</span>}
          </p>
          {cupom.preco_original_centavos !== null && cupom.preco_promocional_centavos !== null && (
            <p className="text-sm text-barro-700">
              de <span className="line-through">{formatarPrecoBRL(cupom.preco_original_centavos / 100)}</span> por{' '}
              <span className="font-semibold text-mata-700">{formatarPrecoBRL(cupom.preco_promocional_centavos / 100)}</span>
            </p>
          )}
          {cupom.condicoes && <p className="mt-1 text-sm text-barro-700">{cupom.condicoes}</p>}
          <p className="mt-1 text-xs text-casca-700">
            Termina em {formatDistanceToNowStrict(new Date(cupom.expira_em), { locale: ptBR })}
            {restantes !== null && ` · ${restantes} ${restantes === 1 ? 'cupom restante' : 'cupons restantes'}`}
          </p>
          {cupom.limite_resgates ? (
            <div className="mt-3">
              <BotaoPegarCupom cupomId={cupom.id} logado={logado} codigoInicial={codigoExistente ?? null} esgotado={restantes === 0} />
            </div>
          ) : (
            <p className="mt-1 text-xs text-casca-700">Mencione que viu no Tanguá App.</p>
          )}
        </div>
      </div>
    </div>
  )
}
