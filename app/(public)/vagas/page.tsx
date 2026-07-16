import { buscarVagas } from '@/lib/queries/cidade'
import { CardVaga } from '@/components/negocio/card-vaga'
import { Briefcase } from 'lucide-react'

export default async function PaginaVagas() {
  const vagas = await buscarVagas()

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-mata-100 text-mata-600">
          <Briefcase className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-medium text-barro-900">Vagas de emprego</h1>
          <p className="text-barro-600">{vagas.length} vagas abertas em Tanguá agora</p>
        </div>
      </div>

      {vagas.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-barro-600">Nenhuma vaga aberta no momento.</p>
          <p className="mt-1 text-barro-500">Volte em breve — novas oportunidades aparecem toda semana.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {vagas.map((vaga) => (
            <CardVaga key={vaga.id} vaga={vaga} />
          ))}
        </div>
      )}
    </div>
  )
}
