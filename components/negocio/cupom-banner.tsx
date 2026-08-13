import { Zap } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Cupom } from '@/lib/types/database'

export function CupomBanner({ cupom }: { cupom: Cupom }) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-casca-300 bg-casca-50 px-4 py-3">
      <Zap className="h-5 w-5 shrink-0 text-casca-600" />
      <div>
        <p className="font-semibold text-casca-800">
          {cupom.titulo} — {cupom.desconto_texto}
        </p>
        <p className="text-xs text-casca-600">
          Termina em {formatDistanceToNowStrict(new Date(cupom.expira_em), { locale: ptBR })} — mencione que viu no Tanguá App.
        </p>
      </div>
    </div>
  )
}
