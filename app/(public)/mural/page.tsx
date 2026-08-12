import { buscarAvisosCidade } from '@/lib/queries/cidade'
import { CardAviso } from '@/components/negocio/card-aviso'
import { Megaphone } from 'lucide-react'

export const revalidate = 60

export default async function PaginaMural() {
  const avisos = await buscarAvisosCidade()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-barro-100 text-barro-700">
          <Megaphone className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Mural da cidade</h1>
          <p className="text-barro-600">Avisos, eventos e utilidade pública de Tanguá</p>
        </div>
      </div>

      {avisos.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-barro-600">Nenhum aviso publicado ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {avisos.map((aviso, i) => (
            <CardAviso key={aviso.id} aviso={aviso} indice={i} />
          ))}
        </div>
      )}
    </div>
  )
}
