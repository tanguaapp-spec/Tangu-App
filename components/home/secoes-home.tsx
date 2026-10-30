import Link from 'next/link'
import Image from 'next/image'
import { CartaoOferta } from '@/components/vitrine/cartao-oferta'
import { CartaoNegocio } from '@/components/vitrine/cartao-negocio'
import { TituloSecao } from '@/components/vitrine/titulo-secao'
import { urlNegocio, type NegocioResumo } from '@/lib/ui/apresentacao'
import type { EventoHome, NovidadeHome, OfertaHome } from '@/lib/queries/home'

// Linha que rola de lado no celular e vira grade no computador.
const trilho =
  'flex snap-x gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] md:grid md:gap-4 md:overflow-visible md:px-0'

/** Estado vazio com contexto: explica e convida, em vez de sumir. */
function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-5 rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-5 text-center text-sm text-barro-700 md:mx-0">
      {children}
    </div>
  )
}

export function SecaoOfertas({ ofertas }: { ofertas: OfertaHome[] }) {
  return (
    <section aria-labelledby="t-ofertas" className="flex flex-col gap-3 md:gap-4">
      <TituloSecao
        id="t-ofertas"
        titulo="Ofertas valendo"
        descricao="Publicadas pelos próprios negócios, com prazo."
        href={ofertas.length ? '/ofertas' : undefined}
        className="px-5 md:px-0 [&_p]:hidden md:[&_p]:block"
      />
      {ofertas.length === 0 ? (
        <Vazio>
          Nenhuma oferta valendo agora. Tem um negócio?{' '}
          <Link href="/cadastrar?papel=profissional&next=/painel/negocio/ofertas" className="font-bold text-casca-700 underline">
            Publique a primeira — é grátis.
          </Link>
        </Vazio>
      ) : (
        <div className={`${trilho} md:grid-cols-[repeat(auto-fill,minmax(250px,1fr))]`}>
          {ofertas.map((o) => (
            <CartaoOferta key={o.id} oferta={o} className="w-[250px] shrink-0 snap-start md:w-auto" />
          ))}
        </div>
      )}
    </section>
  )
}

export function SecaoPopulares({ negocios, reais }: { negocios: NegocioResumo[]; reais: boolean }) {
  if (negocios.length === 0) return null
  return (
    <section aria-labelledby="t-populares" className="flex flex-col gap-3 px-5 md:gap-4 md:px-0">
      <TituloSecao
        id="t-populares"
        titulo={reais ? 'Mais procurados' : 'Em destaque'}
        descricao={reais ? 'Mais visitados nos últimos 30 dias' : 'Perfis verificados e com mais informação'}
        href="/buscar"
        rotuloLink="Explorar"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4">
        {negocios.map((n) => (
          <CartaoNegocio key={n.id} negocio={n} origem="home" />
        ))}
      </div>
    </section>
  )
}

export function SecaoNovidades({ novidades }: { novidades: NovidadeHome[] }) {
  if (novidades.length === 0) return null // aparecem conforme os negócios publicam
  return (
    <section aria-labelledby="t-novidades" className="flex flex-col gap-3 md:gap-4">
      <TituloSecao id="t-novidades" titulo="Novidades da cidade" descricao="O que os negócios publicaram" className="px-5 md:px-0" />
      <div className={`${trilho} md:grid-cols-3`}>
        {novidades.map((n) => (
          <Link
            key={n.id}
            href={n.negocio ? `${urlNegocio(n.negocio)}?origem=home#novidades` : '/'}
            className="flex w-[270px] shrink-0 snap-start flex-col overflow-hidden rounded-[22px] border border-barro-200/80 bg-superficie text-barro-900 md:w-auto"
          >
            {n.imagem_url && (
              <span className="relative block h-32 w-full">
                <Image src={n.imagem_url} alt="" fill sizes="(max-width: 768px) 270px, 33vw" className="object-cover" />
              </span>
            )}
            <span className="flex flex-1 flex-col gap-1 p-4">
              <span className="text-xs font-bold uppercase tracking-wide text-mata-700">
                {n.tipo === 'promocao' ? 'Promoção' : 'Novidade'} · {n.negocio?.nome}
              </span>
              <span className="font-display text-lg font-bold leading-snug">{n.titulo}</span>
              {n.conteudo && <span className="line-clamp-2 text-sm text-barro-700">{n.conteudo}</span>}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function SecaoProfissionais({ profissionais }: { profissionais: NegocioResumo[] }) {
  if (profissionais.length === 0) return null
  return (
    <section aria-labelledby="t-profissionais" className="flex flex-col gap-3 md:gap-4">
      <TituloSecao
        id="t-profissionais"
        titulo="Profissionais da cidade"
        descricao="Autônomos que vão até você ou atendem em casa"
        href="/buscar?tipo=autonomo"
        rotuloLink="Ver todos"
        className="px-5 md:px-0"
      />
      <div className={`${trilho} md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]`}>
        {profissionais.map((n) => (
          <CartaoNegocio key={n.id} negocio={n} origem="home" className="w-40 shrink-0 snap-start md:w-auto" />
        ))}
      </div>
    </section>
  )
}

function dataCurta(iso: string) {
  const d = new Date(iso)
  const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...o }).format(d)
  return {
    dia: fmt({ day: '2-digit' }),
    mes: fmt({ month: 'short' }).replace('.', '').toUpperCase(),
    quando: `${fmt({ weekday: 'long' })}, ${fmt({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h')}`,
  }
}

export function SecaoEventos({ eventos }: { eventos: EventoHome[] }) {
  return (
    <section
      aria-labelledby="t-agenda"
      className="mx-5 flex min-w-0 flex-col gap-3.5 rounded-[24px] border border-barro-200/80 bg-superficie p-5 md:mx-0 md:flex-[999_1_460px] md:rounded-[28px] md:p-6"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="t-agenda" className="font-display text-xl font-bold text-barro-900 md:text-2xl">
          Agenda da cidade
        </h2>
        <Link href="/agenda" className="text-sm font-bold text-casca-700 hover:underline">
          Ver agenda
        </Link>
      </div>
      {eventos.length === 0 ? (
        <p className="text-sm text-barro-700">
          Nenhum evento marcado por enquanto. Sabe de algum?{' '}
          <Link href="/mural" className="font-bold text-casca-700 underline">
            Conte no mural.
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {eventos.map((e, i) => {
            const d = dataCurta(e.data_evento)
            return (
              <li key={e.id}>
                <Link href={`/agenda#evento-${e.id}`} className="flex items-center gap-3.5 text-barro-900">
                  <span
                    className={`flex w-14 shrink-0 flex-col items-center rounded-[14px] py-1.5 ${
                      i % 2 === 0 ? 'bg-casca-100 text-casca-800' : 'bg-mata-100 text-mata-700'
                    }`}
                  >
                    <b className="text-xl leading-none">{d.dia}</b>
                    <span className="text-xs font-bold">{d.mes}</span>
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate">{e.titulo}</b>
                    <span className="text-sm text-barro-600">
                      {d.quando}
                      {e.local_evento ? ` · ${e.local_evento}` : ''}
                    </span>
                  </span>
                </Link>
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
    <section
      aria-labelledby="t-anuncie"
      className="mx-5 flex min-w-0 flex-col gap-3 rounded-[24px] bg-laranja p-6 text-tinta md:mx-0 md:flex-[1_1_340px] md:rounded-[28px] md:p-7"
    >
      <h2 id="t-anuncie" className="font-display text-2xl font-bold leading-[1.1] md:text-[28px]">
        Tem um negócio ou trabalha por conta própria?
      </h2>
      <p className="text-base">Perfil, catálogo, ofertas e WhatsApp direto. Grátis e no ar em minutos.</p>
      <div className="flex flex-wrap gap-2.5">
        <Link
          href="/cadastrar?papel=profissional"
          className="flex h-12 items-center rounded-[14px] bg-tinta px-5 font-bold text-white hover:opacity-90"
        >
          Cadastrar grátis
        </Link>
        <Link href="/planos" className="flex h-12 items-center rounded-[14px] px-3 font-bold underline underline-offset-4">
          Ver planos
        </Link>
      </div>
    </section>
  )
}
