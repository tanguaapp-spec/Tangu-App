import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { FotoNegocio } from '@/components/vitrine/foto-negocio'
import { metaNegocio, urlNegocio, type NegocioResumo } from '@/lib/ui/apresentacao'
import { situacaoHorario } from '@/lib/horario/funcionamento'

/** Linha do Explorar: foto quadrada, nome, selos, categoria/bairro/nota e chips. */
export function LinhaNegocio({ negocio, oferta, origem = 'busca' }: { negocio: NegocioResumo; oferta?: string | null; origem?: string }) {
  const horario = situacaoHorario(negocio.horario_funcionamento, negocio.aberto_agora ?? null)
  return (
    <Link
      href={`${urlNegocio(negocio)}?origem=${origem}`}
      className="flex min-w-0 gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3 text-barro-900 transition-transform active:scale-[0.99]"
    >
      <FotoNegocio
        id={negocio.id}
        url={negocio.foto_capa_url}
        nome={negocio.nome}
        icone={negocio.categoria?.icone}
        tamanhos="76px"
        className="h-[76px] w-[76px] shrink-0 rounded-2xl"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-base font-bold">{negocio.nome}</span>
          {negocio.verificado && <BadgeCheck className="h-4 w-4 shrink-0 text-mata-700" aria-label="Verificado" />}
          {negocio.destaque_ativo && (
            <span className="shrink-0 rounded-full bg-casca-100 px-2 py-0.5 text-xs font-bold text-casca-800">Destaque</span>
          )}
        </span>
        <span className="truncate text-[13px] text-barro-600">{metaNegocio(negocio, { comBairro: true })}</span>
        {(horario.aberto !== null || oferta) && (
          <span className="flex flex-wrap gap-1.5">
            {horario.aberto === true && (
              <span className="rounded-full bg-mata-100 px-2 py-0.5 text-xs font-bold text-mata-700">{horario.rotulo}</span>
            )}
            {horario.aberto === false && (
              <span className="rounded-full bg-barro-100 px-2 py-0.5 text-xs font-semibold text-barro-700">{horario.rotulo}</span>
            )}
            {oferta && <span className="rounded-full bg-barro-900 px-2 py-0.5 font-mono text-xs font-bold text-feira">{oferta}</span>}
          </span>
        )}
      </span>
    </Link>
  )
}
