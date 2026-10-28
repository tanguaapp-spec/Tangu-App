import { BotaoPegarCupom } from '@/components/negocio/botao-pegar-cupom'
import { BotaoCompartilhar } from '@/components/ui/botao-compartilhar'
import { prazoCurto, precoCurto, restantesOferta, seloOferta } from '@/lib/ui/apresentacao'
import { cn } from '@/lib/utils'
import type { Cupom } from '@/lib/types/database'

/** Oferta no perfil (protótipo: cartão pêssego com "Pegar meu cupom"). */
export function CupomBanner({
  cupom,
  logado,
  codigoExistente,
  voltarPara,
  className,
  linkCompartilhar,
}: {
  cupom: Cupom
  logado: boolean
  codigoExistente?: string | null
  voltarPara?: string
  className?: string
  /** endereço completo da oferta (perfil + #oferta) pro botão de compartilhar */
  linkCompartilhar?: string
}) {
  const oferta = { ...cupom, negocio: null }
  const selo = seloOferta(oferta)
  const restantes = restantesOferta(oferta)
  const prazo = prazoCurto(cupom.expira_em)
  return (
    <section
      id="oferta"
      aria-label="Oferta"
      className={cn('flex scroll-mt-24 flex-col gap-2.5 rounded-[22px] bg-casca-100 p-4 text-barro-900 md:flex-row md:flex-wrap md:items-center md:gap-4 md:rounded-[24px] md:px-6 md:py-5', className)}
    >
      <div className="flex min-w-0 flex-col gap-1 md:flex-[1_1_260px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold uppercase text-casca-800">
            Oferta · {prazo === 'hoje' ? 'termina hoje' : prazo === 'amanhã' ? 'termina amanhã' : `termina em ${prazo}`}
            {restantes !== null && <span className="hidden md:inline"> · {restantes} {restantes === 1 ? 'cupom restante' : 'cupons restantes'}</span>}
          </span>
          <span
            className={cn(
              'shrink-0 rounded-[10px] px-2 py-1 text-[13px] font-bold md:hidden',
              selo.percentual ? 'bg-barro-900 font-mono text-feira' : 'bg-mata-100 text-mata-700'
            )}
          >
            {selo.texto}
          </span>
        </div>
        <p className="font-display text-xl font-bold leading-tight md:text-2xl">{cupom.titulo}</p>
        <p className="text-sm md:text-base">
          {cupom.preco_original_centavos && cupom.preco_promocional_centavos !== null ? (
            <>
              de <s>{precoCurto(cupom.preco_original_centavos)}</s> por{' '}
              <b className="font-mono text-mata-700">{precoCurto(cupom.preco_promocional_centavos)}</b>
            </>
          ) : (
            !selo.percentual && <b>{cupom.desconto_texto}</b>
          )}
          {restantes !== null && <span className="md:hidden"> · {restantes} {restantes === 1 ? 'cupom restante' : 'cupons restantes'}</span>}
        </p>
        {cupom.condicoes && <p className="text-sm text-barro-700">{cupom.condicoes}</p>}
        {linkCompartilhar && (
          <BotaoCompartilhar
            url={linkCompartilhar}
            titulo={cupom.titulo}
            texto={`Oferta no Tanguá App: ${cupom.titulo}`}
            rotulo="Compartilhar oferta"
            className="self-start"
          />
        )}
      </div>
      <div className="md:min-w-[220px]">
        {cupom.limite_resgates ? (
          <BotaoPegarCupom cupomId={cupom.id} logado={logado} codigoInicial={codigoExistente ?? null} esgotado={restantes === 0} voltarPara={voltarPara} />
        ) : (
          <p className="rounded-[14px] bg-superficie p-3 text-sm font-semibold">Diga que viu no Tanguá App na hora de pagar.</p>
        )}
      </div>
    </section>
  )
}
