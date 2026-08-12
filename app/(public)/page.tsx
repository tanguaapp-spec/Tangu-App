import Link from 'next/link'
import { ArrowRight, Briefcase, Megaphone, Store, Users } from 'lucide-react'
import { BuscaRapida } from '@/components/busca-rapida'
import { MotivoGomo } from '@/components/motivo-gomo'
import { Laranja3D } from '@/components/laranja-3d'
import { Revelar } from '@/components/ui/revelar'

export const revalidate = 60

const categoriasDestaque = [
  { nome: 'Alimentação', slug: 'alimentacao', emoji: '🍽️' },
  { nome: 'Beleza e Estética', slug: 'beleza-estetica', emoji: '💇' },
  { nome: 'Casa e Construção', slug: 'casa-construcao', emoji: '🔨' },
  { nome: 'Automotivo', slug: 'automotivo', emoji: '🚗' },
  { nome: 'Saúde e Bem-estar', slug: 'saude-bem-estar', emoji: '🩺' },
  { nome: 'Agro e Produção Rural', slug: 'agro-producao-rural', emoji: '🌱' },
]

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

export default function PaginaInicial() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden textura-papel">
        <MotivoGomo className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-casca-500 sm:-right-10" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6">
          <div>
            <span
              className="entrada-lista inline-flex items-center gap-1.5 rounded-full bg-casca-100 px-3 py-1 text-sm font-semibold text-casca-700"
              style={{ '--i': 0 } as React.CSSProperties}
            >
              🍊 Feito por e para quem é de Tanguá
            </span>

            <h1
              className="entrada-lista mt-5 max-w-2xl text-balance font-display text-4xl font-bold leading-[1.05] tracking-tight text-barro-900 sm:text-6xl"
              style={{ '--i': 1 } as React.CSSProperties}
            >
              Tudo da nossa cidade,{' '}
              <span className="italic font-medium text-casca-500">num só lugar.</span>
            </h1>

            <p
              className="entrada-lista mt-5 max-w-xl text-lg text-barro-700"
              style={{ '--i': 2 } as React.CSSProperties}
            >
              Encontre profissionais e comércios locais, fique de olho nas vagas de emprego
              e acompanhe os avisos da cidade — tudo conectado, tudo de Tanguá.
            </p>

            <div className="entrada-lista mt-8" style={{ '--i': 3 } as React.CSSProperties}>
              <BuscaRapida />
            </div>

            <div className="entrada-lista mt-6 flex flex-wrap gap-2" style={{ '--i': 4 } as React.CSSProperties}>
              {categoriasDestaque.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/buscar?categoria=${cat.slug}`}
                  className="rounded-full bg-white px-4 py-1.5 text-sm text-barro-700 shadow-sm transition-colors hover:bg-casca-50 hover:text-casca-700"
                >
                  {cat.emoji} {cat.nome}
                </Link>
              ))}
            </div>
          </div>

          {/* mascote: a laranja de Tanguá */}
          <div
            className="entrada-lista order-first lg:order-last"
            style={{ '--i': 1 } as React.CSSProperties}
          >
            <Laranja3D className="mx-auto w-48 sm:w-64 lg:w-full" />
          </div>
        </div>
      </section>

      {/* TRÊS PILARES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {pilares.map((p, i) => {
            const cores = coresPilar[p.cor]
            return (
              <Link
                key={p.href}
                href={p.href}
                className="entrada-lista group rounded-casca border border-barro-100 bg-white p-6 shadow-feira transition-all hover:-translate-y-1.5 hover:shadow-feira-lg"
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

      {/* CTA PROFISSIONAL */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Revelar className="relative overflow-hidden rounded-casca bg-mata-700 px-8 py-12 text-white sm:px-14">
          <MotivoGomo className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 text-white" />
          <div className="relative max-w-xl">
            <Users className="h-8 w-8 text-mata-200" />
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-balance leading-tight sm:text-4xl">
              Tem um negócio em Tanguá? Apareça pra cidade toda.
            </h2>
            <p className="mt-3 text-mata-100">
              Reivindique seu perfil gratuitamente, atualize seus dados e poste suas
              novidades direto pro feed de quem está por perto.
            </p>
            <Link
              href="/cadastrar?papel=profissional"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-casca-500 px-6 py-3 font-semibold text-white transition-all hover:gap-3 hover:bg-casca-600"
            >
              Cadastrar meu negócio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Revelar>
      </section>
    </>
  )
}
