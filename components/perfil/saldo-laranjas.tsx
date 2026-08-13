export function SaldoLaranjas({ saldo }: { saldo: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-casca-500 p-4 text-white shadow-feira-lg">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl">🍊</span>
      <div>
        <p className="font-display text-2xl font-bold leading-none">{saldo}</p>
        <p className="mt-1 text-sm text-casca-50">
          {saldo === 1 ? 'Laranja acumulada' : 'Laranjas acumuladas'} — avalie, favorite e indique vizinhos pra ganhar mais.
        </p>
      </div>
    </div>
  )
}
