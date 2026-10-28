import { VitrineBanners } from '@/components/divulgacao/vitrine-banners'
import Link from 'next/link'
import { CampoBusca } from '@/components/busca/campo-busca'
import { Search } from 'lucide-react'
import { TopoInicio } from '@/components/home/topo-inicio'
import { ParaVoce } from '@/components/home/para-voce'
import { VistosRecentemente } from '@/components/home/vistos-recentemente'
import { FotoNegocio } from '@/components/vitrine/foto-negocio'
import { buscarAchadoDoDia, buscarNegociosVitrine } from '@/lib/queries/negocios'
import {
  categoriasInicio,
  negociosPopulares,
  novidadesRecentes,
  ofertasVigentes,
  ordemSecoesHome,
  profissionaisAutonomos,
  proximosEventos,
  type SecaoHome,
} from '@/lib/queries/home'
import {
  SecaoAnuncie,
  SecaoEventos,
  SecaoNovidades,
  SecaoOfertas,
  SecaoPopulares,
  SecaoProfissionais,
} from '@/components/home/secoes-home'
import { metaNegocio, urlNegocio } from '@/lib/ui/apresentacao'

export const revalidate = 60

export default async function PaginaInicial() {
  const achado = await buscarAchadoDoDia()
  const [categorias, ordem, ofertas, novidades, populares, profissionais, eventos, vitrine] = await Promise.all([
    categoriasInicio(),
    ordemSecoesHome(),
    ofertasVigentes(10),
    novidadesRecentes(),
    negociosPopulares(6),
    profissionaisAutonomos(8),
    proximosEventos(4),
    buscarNegociosVitrine(6, achado?.id),
  ])
  // "Mais procurados" só com números reais; enquanto não há, mostra a vitrine
  // (destaque > verificado > nota) com outro título.
  const procurados = populares.length >= 2 ? populares : vitrine

  const blocos: Record<SecaoHome, React.ReactNode> = {
    ofertas: <SecaoOfertas key="ofertas" ofertas={ofertas} />,
    populares: <SecaoPopulares key="populares" negocios={procurados} reais={populares.length >= 2} />,
    novidades: <SecaoNovidades key="novidades" novidades={novidades} />,
    profissionais: <SecaoProfissionais key="profissionais" profissionais={profissionais} />,
    eventos: null,
    anuncie: null,
  }
  // agenda e "anuncie" andam juntos (lado a lado no computador), na posição do primeiro
  const posicaoDupla = Math.min(...(['eventos', 'anuncie'] as const).map((s) => (ordem.includes(s) ? ordem.indexOf(s) : 99)))

  return (
    <>
      {/* um único H1 pra buscadores e leitores de tela; os títulos visíveis mudam entre celular e computador */}
      <h1 className="sr-only">Tanguá App: tudo de Tanguá, perto de você</h1>
      <TopoInicio />

      {/* computador: herói verde do protótipo "Início — desktop" */}
      <section className="mx-auto hidden max-w-[1200px] px-6 pt-7 md:block">
        <div className="flex flex-wrap items-center gap-8 rounded-[32px] bg-serra p-[clamp(24px,5vw,56px)] text-white">
          <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-[18px]">
            <p className="text-[15px] font-semibold text-white/75">Tanguá · RJ</p>
            <p className="font-display text-[clamp(36px,5vw,60px)] font-bold leading-[1.02]">Tudo de Tanguá, perto de você.</p>
            <p className="max-w-[560px] text-lg leading-relaxed text-white/85">
              Comércios, profissionais, ofertas e o que acontece na cidade. Fale direto no WhatsApp, sem intermediário.
            </p>
            <form action="/buscar" method="get" role="search" className="flex max-w-[620px] flex-wrap gap-2.5">
              <label className="relative flex h-14 min-w-0 flex-[1_1_260px] items-center gap-2.5 rounded-2xl bg-white px-4">
                <Search className="h-5 w-5 shrink-0 text-[#55655D]" aria-hidden="true" />
                <CampoBusca
                  placeholder="Pizza, eletricista, farmácia…"
                  rotulo="Buscar em Tanguá"
                  className="min-w-0 flex-1 bg-transparent text-base text-[#13241D] placeholder:text-[#6B7A72] focus:outline-none"
                />
              </label>
              <button type="submit" className="h-14 rounded-2xl bg-laranja px-6 font-bold text-tinta hover:bg-laranja-claro">
                Buscar
              </button>
            </form>
            <div className="flex flex-wrap gap-2">
              {categorias.slice(0, 6).map((c) => (
                <Link
                  key={c.id}
                  href={`/categoria/${c.slug}`}
                  className="flex h-[38px] items-center rounded-full bg-white/[0.12] px-3.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  {c.nome}
                </Link>
              ))}
            </div>
          </div>
          {achado && (
            <Link
              href={`${urlNegocio(achado)}?origem=home`}
              className="min-w-0 max-w-[380px] flex-[1_1_300px] overflow-hidden rounded-[24px] bg-superficie text-barro-900"
            >
              <FotoNegocio
                id={achado.id}
                url={achado.foto_capa_url}
                nome={achado.nome}
                icone={achado.categoria?.icone}
                tamanhos="380px"
                prioridade
                className="h-[170px] w-full"
              />
              <span className="flex flex-col gap-1 px-[18px] py-4">
                <span className="font-mono text-xs font-bold text-casca-700">ACHADO DO DIA</span>
                <span className="font-display text-[22px] font-bold">{achado.nome}</span>
                <span className="text-sm text-barro-600">{metaNegocio(achado, { comBairro: true })}</span>
              </span>
            </Link>
          )}
        </div>
      </section>

      <div className="mx-auto flex max-w-[1200px] flex-col gap-[22px] pt-4 md:gap-11 md:px-6 md:pt-10">
        {/* categorias (celular): Tudo em destaque, o resto rola de lado */}
        <nav aria-label="Categorias" className="flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] md:hidden">
          <Link
            href="/buscar"
            className="flex h-10 shrink-0 items-center rounded-full bg-barro-900 px-4 text-sm font-bold text-feira"
          >
            Tudo
          </Link>
          {categorias.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="flex h-10 shrink-0 items-center rounded-full border border-barro-200/80 bg-superficie px-4 text-sm font-semibold text-barro-900"
            >
              {c.nome}
            </Link>
          ))}
        </nav>

        <VitrineBanners posicao="banner_home" className="px-5 md:px-0" />

        {/* atalhos da cidade: no celular a barra de baixo só tem 5 lugares */}
        <nav aria-label="Na cidade" className="flex gap-2.5 overflow-x-auto px-5 [scrollbar-width:none] md:px-0">
          {[
            ['/cidade', 'Na cidade'],
            ['/noticias', 'Notícias'],
            ['/servicos-uteis', 'Farmácia de plantão e telefones'],
            ['/agenda', 'Agenda'],
            ['/mapa', 'Mapa'],
            ['/vagas', 'Vagas'],
          ].map(([href, rotulo], i) => (
            <Link
              key={href}
              href={href}
              className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold ${i === 0 ? 'bg-serra text-white' : 'border border-barro-200/80 bg-superficie text-barro-900'}`}
            >
              {rotulo}
            </Link>
          ))}
        </nav>

        {ordem.map((secao, i) => {
          if (secao === 'eventos' || secao === 'anuncie') {
            if (i !== posicaoDupla) return null
            return (
              <div key="agenda-anuncie" className="flex flex-col gap-[22px] md:flex-row md:flex-wrap md:gap-6">
                {ordem.includes('eventos') && <SecaoEventos eventos={eventos} />}
                {ordem.includes('anuncie') && <SecaoAnuncie />}
              </div>
            )
          }
          return (
            <div key={secao} className="contents">
              {blocos[secao]}
              {secao === 'populares' && <ParaVoce />}
            </div>
          )
        })}

        <VistosRecentemente />
      </div>
    </>
  )
}
