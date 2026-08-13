import { Award } from 'lucide-react'
import { calcularSelos } from '@/lib/gamificacao/selos'

export function SelosContribuicao({ totalAvaliacoes, totalFavoritos }: { totalAvaliacoes: number; totalFavoritos: number }) {
  const selos = calcularSelos(totalAvaliacoes, totalFavoritos)

  if (selos.length === 0) {
    return (
      <div className="rounded-casca border border-dashed border-barro-200 bg-barro-50 p-4 text-sm text-barro-600">
        Avalie um negócio ou favorite alguns perfis pra desbloquear seus primeiros selos de contribuição.
      </div>
    )
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {selos.map((selo) => (
        <div key={selo.chave} className="flex items-start gap-2.5 rounded-xl bg-barro-50 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-casca-500 text-white">
            <Award className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-casca-800">{selo.rotulo}</span>
            <span className="block text-xs text-barro-600">{selo.descricao}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
