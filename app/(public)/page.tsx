import Link from 'next/link'
import { ArrowRight, Briefcase, Megaphone, Sparkles, Store } from 'lucide-react'
import { BuscaRapida } from '@/components/busca-rapida'
import { MotivoGomo } from '@/components/motivo-gomo'
import { LogoTangua } from '@/components/marca/logo-tangua'
import { CardAchadoDoDia } from '@/components/negocio/card-achado-do-dia'
import { CardNegocioMini } from '@/components/negocio/card-negocio-mini'
import { iconeCategoria } from '@/lib/ui/icone-categoria'
import { buscarAchadoDoDia, buscarNegociosVitrine } from '@/lib/queries/negocios'
import {
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

export const revalidate = 60

// nome do ícone bate com o seed de `categorias.icone` (supabase/migrations/0001) —
// mesmo ícone que aparece no card de cada negócio dessa categoria.
const categoriasDestaque = [
  { nome: 'Alimentação', slug: 'alimentacao', icone: 'utensils' },
  { nome: 'Beleza e Estética', slug: 'beleza-estetica', icone: 'scissors' },
  { nome: 'Casa e Construção', slug: 'casa-construcao', icone: 'hammer' },
  { nome: 'Automotivo', slug: 'automotivo', icone: 'car' },
  { nome: 'Saúde e Bem-estar', slug: 'saude-bem-estar', icone: 'heart-pulse' },
  { nome: 'Agro e Produção Rural', slug: 'agro-producao-rural', icone: 'sprout' },
]

function saudacao() {
  const hora = new Date().getHours()
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

const pilares = [
  {
    href: '/buscar',
    icone: Store,
    cor: 'casca' as const,
    titulo: 'Profissionais e comércios',
    texto: 'Negócios locais, com contato direto por WhatsApp.',
    rotulo: 'Explorar diretório',
  },
  {
    href: '/vagas',
    icone: Briefcase,
    cor: 'mata' as const,
    titulo: 'Vagas de emprego',
    texto: 'Oportunidades reais de empresas e comércios da região.',
    rotulo: 'Ver vagas abertas',
  },
  {
    href: '/mural',
    icone: Megaphone,
    cor: 'barro' as const,
    titulo: 'Mural da cidade',
    texto: 'Eventos, avisos, utilidade pública e achados e perdidos.',
    rotulo: 'Ver o mural',
  },
]

const coresPilar = {
  casca: { bg: 'bg-casca-100', texto: 'text-casca-600', link: 'text-casca-600' },
  mata: { bg: 'bg-mata-100', texto: 'text-mata-600', link: 'text-mata-600' },
  barro: { bg: 'bg-barro-100', texto: 'text-barro-700', link: 'text-barro-700' },
}

export default async function PaginaInicial() {
  const achadoDoDia = await buscarAchadoDoDia()
  const [pertoDeVoce, ordem, ofertas, novidades, populares, profissionais, eventos] = await Promise.all([
    buscarNegociosVitrine(4, achadoDoDia?.id),
    ordemSecoesHome(),
    ofertasVigentes(),
    novidadesRecentes(),
    negociosPopulares(),
    profissionaisAutonomos(),
    proximosEventos(),
  ])

  const secoes: Record<SecaoHome, React.ReactNode> = {
    ofertas: <SecaoOfertas key="ofertas" ofertas={ofertas} />,
    novidades: <SecaoNovidades key="novidades" novidades={novidades} />,
    populares: <SecaoPopulares key="populares" negocios={populares} />,
    profissionais: <SecaoProfissionais key="profissionais" profissionais={profissionais} />,
    eventos: <SecaoEventos key="eventos" eventos={eventos} />,
    anuncie: <SecaoAnuncie key="anuncie" />,
  }

  return (
    <>
      {/* HERO — mobile: painel escuro compacto, cara de app (aba "Início") */}
      <section className="relative overflow-hidden rounded-b-[28px] bg-serra-escuro px-4 pb-6 pt-3 text-white lg:hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-mata-400 opacity-20 blur-3xl"
        />
        <div className="relative">
          <p className="entrada-lista text-xs font-semibold uppercase tracking-wide text-white/70" style={{ '--i': 0 } as React.CSSProperties}>
            Tanguá, RJ
          </p>
          <h1 className="entrada-lista mt-1 font-display text-2xl font-bold" style={{ '--i': 1 } as React.CSSProperties}>
            {saudacao()}!
          </h1>
          <p className="entrada-lista mt-1 text-sm text-white/80" style={{ '--i': 2 } as React.CSSProperties}>
            O que você precisa encontrar hoje?
          </p>
          <div className="entrada-lista mt-4" style={{ '--i': 3 } as React.CSSProperties}>
            <BuscaRapida />
          </div>
        </div>
      </section>

      {/* HERO — desktop/tablet: bloco verde da marca */}
      <section className="mx-auto hidden max-w-6xl px-4 pt-8 sm:px-6 lg:block">
        <div className="relative overflow-hidden rounded-[32px] bg-serra px-12 py-14 text-white">
          <MotivoGomo className="pointer-events-none absolute -right-28 -top-28 h-[440px] w-[440px] text-white opacity-[0.06]" />
          <div className="relative grid grid-cols-[1.25fr_0.75fr] items-center gap-10">
            <div>
              <p className="entrada-lista text-sm font-semibold text-white/75" style={{ '--i': 0 } as React.CSSProperties}>
                Tanguá · RJ
              </p>
              <h1
                className="entrada-lista mt-3 max-w-2xl text-balance font-display text-6xl font-bold leading-[1.02]"
                style={{ '--i': 1 } as React.CSSProperties}
              >
                Tudo de Tanguá, perto de você.
              </h1>
              <p className="entrada-lista mt-5 max-w-xl text-lg text-white/85" style={{ '--i': 2 } as React.CSSProperties}>
                Comércios, profissionais, ofertas e o que acontece na cidade. Fale direto no WhatsApp, sem
                intermediário.
              </p>
              <div className="entrada-lista mt-8" style={{ '--i': 3 } as React.CSSProperties}>
                <BuscaRapida />
              </div>
            </div>
            <div className="entrada-lista flex justify-center" style={{ '--i': 1 } as React.CSSProperties}>
              <LogoTangua variante="sobre-escuro" className="h-64 w-64 drop-shadow-[0_18px_30px_rgba(0,0,0,0.25)]" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIAS — pílulas de atalho, compartilhadas pelas duas versões do hero */}
      <section className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:pt-6">
        <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible">
          <Link
            href="/buscar"
            className="shrink-0 rounded-full bg-laranja px-4 py-1.5 text-sm font-semibold text-tinta shadow-sm"
          >
            Tudo
          </Link>
          {categoriasDestaque.map((cat) => {
            const Icone = iconeCategoria(cat.icone)
            return (
              <Link
                key={cat.slug}
                href={`/buscar?categoria=${cat.slug}`}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-superficie px-4 py-1.5 text-sm text-barro-700 shadow-sm transition-colors hover:bg-casca-50 hover:text-casca-700"
              >
                <Icone className="h-3.5 w-3.5" />
                {cat.nome}
              </Link>
            )
          })}
        </div>
      </section>

      {/* ACHADO DO DIA */}
      {achadoDoDia && (
        <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-casca-500" />
            <h2 className="font-display text-xl font-semibold text-barro-900">Achado do dia</h2>
          </div>
          <p className="mt-1 text-sm text-barro-600">Um negócio em destaque todo dia — hoje é a vez desse aqui.</p>
          <div className="mt-4 max-w-sm">
            <CardAchadoDoDia negocio={achadoDoDia} />
          </div>
        </section>
      )}

      {/* PERTO DE VOCÊ */}
      {pertoDeVoce.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
          <h2 className="font-display text-xl font-semibold text-barro-900">Em destaque no diretório</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pertoDeVoce.map((negocio) => (
              <CardNegocioMini key={negocio.id} negocio={negocio} />
            ))}
          </div>
        </section>
      )}

      {ordem.map((secao) => secoes[secao])}

      {/* TRÊS PILARES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {pilares.map((p, i) => {
            const cores = coresPilar[p.cor]
            return (
              <Link
                key={p.href}
                href={p.href}
                className="entrada-lista group rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira transition-all hover:-translate-y-1.5 hover:shadow-feira-lg"
                style={{ '--i': i } as React.CSSProperties}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cores.bg} ${cores.texto} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                  <p.icone className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-barro-900">{p.titulo}</h3>
                <p className="mt-2 text-barro-600">{p.texto}</p>
                <span className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${cores.link} transition-all group-hover:gap-2`}>
                  {p.rotulo} <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

    </>
  )
}
