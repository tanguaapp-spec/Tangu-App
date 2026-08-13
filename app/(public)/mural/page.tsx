import { buscarAvisosCidade, buscarRespostasPerguntas, buscarReacoes } from '@/lib/queries/cidade'
import { createClient } from '@/lib/supabase/server'
import { CardAviso } from '@/components/negocio/card-aviso'
import { FormularioPergunta } from '@/components/mural/formulario-pergunta'
import { Megaphone } from 'lucide-react'

export const revalidate = 60

export default async function PaginaMural() {
  const supabase = createClient()
  const [avisos, { data: { user } }] = await Promise.all([buscarAvisosCidade(), supabase.auth.getUser()])

  const avisoIds = avisos.map((a) => a.id)
  const [respostasPorAviso, { contagens, minhas }] = await Promise.all([
    buscarRespostasPerguntas(avisoIds),
    buscarReacoes(avisoIds, user?.id),
  ])

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-barro-100 text-barro-700">
          <Megaphone className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Mural da cidade</h1>
          <p className="text-barro-600">Avisos, eventos, utilidade pública e perguntas de Tanguá</p>
        </div>
      </div>

      <div className="mt-6">
        {user ? (
          <FormularioPergunta />
        ) : (
          <p className="rounded-xl border border-dashed border-barro-300 px-4 py-3 text-sm text-barro-500">
            <a href="/entrar" className="font-medium text-casca-600 hover:underline">
              Entre
            </a>{' '}
            pra perguntar pra cidade ou reagir aos avisos.
          </p>
        )}
      </div>

      {avisos.length === 0 ? (
        <div className="mt-16 text-center">
          <p className="text-lg text-barro-600">Nenhum aviso publicado ainda.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {avisos.map((aviso, i) => (
            <CardAviso
              key={aviso.id}
              aviso={aviso}
              indice={i}
              contagensReacao={contagens.get(aviso.id) ?? {}}
              minhaReacao={minhas.get(aviso.id)}
              logado={!!user}
              respostas={respostasPorAviso.get(aviso.id) ?? []}
            />
          ))}
        </div>
      )}
    </div>
  )
}
