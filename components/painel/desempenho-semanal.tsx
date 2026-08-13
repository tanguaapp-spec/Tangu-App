import { Eye, Heart, MessageCircle, TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface Metrica {
  atual: number
  anterior: number
}

function Variacao({ atual, anterior }: Metrica) {
  if (anterior === 0 && atual === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-barro-400">
        <Minus className="h-3 w-3" /> sem dados na semana passada
      </span>
    )
  }
  const diferenca = atual - anterior
  const percentual = anterior === 0 ? 100 : Math.round((diferenca / anterior) * 100)
  if (diferenca === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-barro-500">
        <Minus className="h-3 w-3" /> igual à semana passada
      </span>
    )
  }
  const subiu = diferenca > 0
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${subiu ? 'text-mata-600' : 'text-red-500'}`}>
      {subiu ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {subiu ? '+' : ''}
      {percentual}% vs. semana passada
    </span>
  )
}

export function DesempenhoSemanal({
  desempenho,
}: {
  desempenho: { visualizacoes: Metrica; favoritos: Metrica; cliquesWhatsapp: Metrica }
}) {
  const cartoes = [
    { titulo: 'Visualizações do perfil', icone: Eye, cor: 'text-casca-500', dado: desempenho.visualizacoes },
    { titulo: 'Novos favoritos', icone: Heart, cor: 'text-casca-500', dado: desempenho.favoritos },
    { titulo: 'Cliques em "Chamar no WhatsApp"', icone: MessageCircle, cor: 'text-mata-500', dado: desempenho.cliquesWhatsapp },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cartoes.map((c) => (
        <div key={c.titulo} className="rounded-xl border border-barro-100 bg-white p-4">
          <c.icone className={`h-5 w-5 ${c.cor}`} />
          <p className="mt-2 text-2xl font-semibold text-barro-900">{c.dado.atual}</p>
          <p className="text-sm text-barro-500">{c.titulo} (7 dias)</p>
          <div className="mt-1.5">
            <Variacao {...c.dado} />
          </div>
        </div>
      ))}
    </div>
  )
}
