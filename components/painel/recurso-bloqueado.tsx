import Link from 'next/link'
import { Lock } from 'lucide-react'
import { AJUDA_RECURSO, ROTULO_RECURSO, type ChaveRecurso } from '@/lib/planos/limites'
import { planoQueLibera } from '@/lib/planos/recursos'

/** Cadeado no lugar de um recurso que o plano atual não inclui, com o caminho para liberar. */
export async function RecursoBloqueado({ recurso, souDono = true }: { recurso: ChaveRecurso; souDono?: boolean }) {
  const plano = await planoQueLibera(recurso)
  return (
    <section className="flex flex-col items-start gap-3 rounded-[24px] border border-dashed border-barro-300 bg-superficie p-5">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-casca-100 text-casca-800">
        <Lock className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-display text-lg font-bold text-barro-900">{ROTULO_RECURSO[recurso]}</h2>
        <p className="mt-1 text-sm text-barro-700">{AJUDA_RECURSO[recurso]}</p>
        <p className="mt-1 text-sm text-barro-600">{plano ? `Disponível a partir do plano ${plano}.` : 'Não está disponível em nenhum plano no momento.'}</p>
      </div>
      {plano &&
        (souDono ? (
          <Link href="/painel/negocio/assinatura" className="inline-flex min-h-11 items-center rounded-xl bg-laranja px-4 font-bold text-tinta">
            Ver planos
          </Link>
        ) : (
          <p className="text-sm text-barro-600">Peça para a pessoa dona do negócio mudar o plano.</p>
        ))}
    </section>
  )
}
