export function SaldoLaranjas({ saldo }: { saldo: number }) {
  return (
    <div className="flex items-center gap-3 rounded-casca border border-casca-200 bg-casca-50 p-5">
      <span className="text-3xl">🍊</span>
      <div>
        <p className="text-2xl font-semibold text-casca-800">{saldo}</p>
        <p className="text-sm text-casca-700">
          {saldo === 1 ? 'Laranja acumulada' : 'Laranjas acumuladas'} — avaliando, favoritando e indicando vizinhos você ganha mais.
        </p>
      </div>
    </div>
  )
}
