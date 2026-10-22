import Link from 'next/link'
import { ArrowRight, CalendarDays, Megaphone, Sparkles, Tag, TrendingUp, UserRound } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CardNegocioMini } from '@/components/negocio/card-negocio-mini'
import type { EventoHome, NovidadeHome, OfertaHome } from '@/lib/queries/home'
import type { Negocio } from '@/lib/types/database'

function Cabecalho({ icone: Icone, titulo, descricao, href, rotuloLink }: { icone: typeof Tag; titulo: string; descricao?: string; href?: string; rotuloLink?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-barro-900">
          <Icone className="h-5 w-5 text-casca-500" aria-hidden="true" />
          {titulo}
        </h2>
        {descricao && <p className="mt-0.5 text-sm text-barro-600">{descricao}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-casca-700 hover:underline">
          {rotuloLink ?? 'Ver tudo'} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

/** Estado vazio com contexto — em vez de esconder, explica e convida a participar. */
function Vazio({ texto, href, rotulo }: { texto: string; href: string; rotulo: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-barro-200 bg-superficie/60 p-5 text-sm text-barro-600">
      {texto}{' '}
      <Link href={href} className="font-semibold text-casca-700 underline">
        {rotulo}
      </Link>
    </div>
  )
}

const envoltorio = 'mx-auto max-w-6xl px-4 pt-8 sm:px-6'

export function SecaoOfertas({ ofertas }: { ofertas: OfertaHome[] }) {
  return (
    <section className={envoltorio} aria-label="Ofertas valendo">
      <Cabecalho icone={Tag} titulo="Ofertas valendo" descricao="Promoções publicadas pelos próprios negócios, com prazo." />
      {ofertas.length === 0 ? (
        <Vazio texto="Nenhuma oferta ativa agora. Tem um negócio? Publique a primeira oferta da cidade —" href="/painel/negocio#ofertas" rotulo="é grátis." />
      ) : (
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {ofertas.map((o) => (
            <li key={o.id} className="w-64 shrink-0 snap-start">
              <Link href={`/negocio/${o.negocio?.id}`} className="block h-full rounded-2xl border border-casca-200 bg-casca-50 p-4 transition-shadow hover:shadow-feira">
                <span className="inline-block rounded-full bg-laranja px-2.5 py-0.5 text-xs font-bold text-tinta">{o.desconto_texto}</span>
                <span className="mt-2 block font-semibold text-barro-900">{o.titulo}</span>
                <span className="mt-1 block text-sm text-barro-600">{o.negocio?.nome}</span>
                <span className="mt-2 block text-xs text-barro-500">
                  Até {format(new Date(o.expira_em), "d 'de' MMM, HH'h'mm", { locale: ptBR })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export function SecaoNovidades({ novidades }: { novidades: NovidadeHome[] }) {
  if (novidades.length === 0) return null // sem alarde: novidades aparecem conforme os negócios publicam
  return (
    <section className={envoltorio} aria-label="Novidades dos negócios">
      <Cabecalho icone={Megaphone} titulo="Novidades da cidade" descricao="O que os negócios publicaram nos últimos 30 dias." />
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {novidades.map((n) => (
          <li key={n.id}>
            <Link href={`/negocio/${n.negocio?.id}`} className="block h-full rounded-2xl border border-barro-100 bg-superficie p-4 hover:border-casca-300">
              <span className="text-xs font-semibold uppercase tracking-wide text-mata-700">{n.tipo === 'promocao' ? 'Promoção' : 'Novidade'}</span>
              <span className="mt-1 block font-semibold text-barro-900">{n.titulo}</span>
              {n.conteudo && <span className="mt-1 line-clamp-2 block text-sm text-barro-600">{n.conteudo}</span>}
              <span className="mt-2 block text-xs text-barro-500">
                {n.negocio?.nome} · {format(new Date(n.criado_em), "d 'de' MMM", { locale: ptBR })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function SecaoPopulares({ negocios }: { negocios: (Negocio & { visitas: number })[] }) {
  if (negocios.length === 0) return null
  return (
    <section className={envoltorio} aria-label="Mais procurados">
      <Cabecalho icone={TrendingUp} titulo="Mais procurados" descricao="Perfis com mais visitantes diferentes nos últimos 30 dias." href="/buscar" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {negocios.map((n) => (
          <CardNegocioMini key={n.id} negocio={n} />
        ))}
      </div>
    </section>
  )
}

export function SecaoProfissionais({ profissionais }: { profissionais: Negocio[] }) {
  return (
    <section className={envoltorio} aria-label="Profissionais autônomos">
      <Cabecalho
        icone={UserRound}
        titulo="Profissionais da cidade"
        descricao="Autônomos que atendem em casa, vão até você ou trabalham online. Quem tem selo Destaque pagou pra aparecer primeiro."
        href="/buscar?modalidade=atende_domicilio"
      />
      {profissionais.length === 0 ? (
        <Vazio texto="Ainda poucos profissionais cadastrados. Você trabalha por conta própria?" href="/cadastrar?papel=profissional" rotulo="Crie seu perfil grátis." />
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {profissionais.map((n) => (
            <CardNegocioMini key={n.id} negocio={n} />
          ))}
        </div>
      )}
    </section>
  )
}

export function SecaoEventos({ eventos }: { eventos: EventoHome[] }) {
  return (
    <section className={envoltorio} aria-label="Agenda">
      <Cabecalho icone={CalendarDays} titulo="Agenda da cidade" href="/mural?tipo=evento" rotuloLink="Ver mural" />
      {eventos.length === 0 ? (
        <Vazio texto="Nenhum evento marcado por enquanto. Os avisos do mural ficam em" href="/mural" rotulo="Mural da cidade." />
      ) : (
        <ul className="mt-3 divide-y divide-barro-100 rounded-2xl border border-barro-100 bg-superficie">
          {eventos.map((e) => {
            const data = new Date(e.data_evento)
            return (
              <li key={e.id} className="flex items-center gap-4 p-4">
                <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-casca-100 py-1 text-casca-800">
                  <span className="text-lg font-bold leading-none">{format(data, 'd')}</span>
                  <span className="text-[11px] font-semibold uppercase">{format(data, 'MMM', { locale: ptBR })}</span>
                </span>
                <span>
                  <span className="block font-semibold text-barro-900">{e.titulo}</span>
                  <span className="text-sm text-barro-600">
                    {format(data, "EEEE, HH'h'mm", { locale: ptBR })}
                    {e.local_evento ? ` · ${e.local_evento}` : ''}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function SecaoAnuncie() {
  return (
    <section className={envoltorio} aria-label="Anuncie seu negócio">
      <div className="relative overflow-hidden rounded-casca bg-serra px-6 py-10 text-white sm:px-12">
        <Sparkles className="h-7 w-7 text-white/80" aria-hidden="true" />
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-balance">
          Tem um negócio ou trabalha por conta própria? Apareça pra cidade toda.
        </h2>
        <p className="mt-2 max-w-xl text-white/85">
          Perfil, catálogo, ofertas e WhatsApp direto — grátis, no ar em minutos, sem precisar falar com ninguém.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/cadastrar?papel=profissional" className="inline-flex items-center gap-2 rounded-xl bg-laranja px-5 py-2.5 font-semibold text-tinta hover:bg-laranja-claro">
            Cadastrar grátis <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link href="/planos" className="inline-flex items-center rounded-xl border border-white/40 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
            Ver planos
          </Link>
        </div>
      </div>
    </section>
  )
}
