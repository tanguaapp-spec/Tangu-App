import Link from 'next/link'
import { ArrowRight, Briefcase, Megaphone, Store, Users } from 'lucide-react'
import { BuscaRapida } from '@/components/busca-rapida'
import { MotivoGomo } from '@/components/motivo-gomo'

const categoriasDestaque = [
  { nome: 'Alimentação', slug: 'alimentacao', emoji: '🍽️' },
  { nome: 'Beleza e Estética', slug: 'beleza-estetica', emoji: '💇' },
  { nome: 'Casa e Construção', slug: 'casa-construcao', emoji: '🔨' },
  { nome: 'Automotivo', slug: 'automotivo', emoji: '🚗' },
  { nome: 'Saúde e Bem-estar', slug: 'saude-bem-estar', emoji: '🩺' },
  { nome: 'Agro e Produção Rural', slug: 'agro-producao-rural', emoji: '🌱' },
]

export default function PaginaInicial() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden textura-papel">
        <MotivoGomo className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] text-casca-500 sm:-right-10" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-casca-100 px-3 py-1 text-sm font-semibold text-casca-700">
            🍊 Feito por e para quem é de Tanguá
          </span>

          <h1 className="mt-5 max-w-2xl font-display text-4xl font-medium leading-[1.1] text-barro-900 sm:text-6xl">
            Tudo da nossa cidade,{' '}
            <span className="italic text-casca-500">num só lugar.</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg text-barro-700">
            Encontre profissionais e comércios locais, fique de olho nas vagas de emprego
            e acompanhe os avisos da cidade — tudo conectado, tudo de Tanguá.
          </p>

          <div className="mt-8">
            <BuscaRapida />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
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
      </section>

      {/* TRÊS PILARES */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <Link
            href="/buscar"
            className="group rounded-casca border border-barro-100 bg-white p-6 shadow-feira transition-all hover:-translate-y-1 hover:shadow-feira-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-casca-100 text-casca-600">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-barro-900">
              Profissionais e comércios
            </h3>
            <p className="mt-2 text-barro-600">
              Mais de uma centena de negócios locais, com contato direto por WhatsApp.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-casca-600 group-hover:gap-2 transition-all">
              Explorar diretório <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/vagas"
            className="group rounded-casca border border-barro-100 bg-white p-6 shadow-feira transition-all hover:-translate-y-1 hover:shadow-feira-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-mata-100 text-mata-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-barro-900">
              Vagas de emprego
            </h3>
            <p className="mt-2 text-barro-600">
              Oportunidades reais de empresas e comércios da região, sempre atualizadas.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-mata-600 group-hover:gap-2 transition-all">
              Ver vagas abertas <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          <Link
            href="/mural"
            className="group rounded-casca border border-barro-100 bg-white p-6 shadow-feira transition-all hover:-translate-y-1 hover:shadow-feira-lg"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-barro-100 text-barro-700">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-semibold text-barro-900">
              Mural da cidade
            </h3>
            <p className="mt-2 text-barro-600">
              Eventos, avisos da prefeitura, utilidade pública e achados e perdidos.
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-barro-700 group-hover:gap-2 transition-all">
              Ver o mural <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* CTA PROFISSIONAL */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-casca bg-mata-700 px-8 py-12 text-white sm:px-14">
          <MotivoGomo className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 text-white" />
          <div className="relative max-w-xl">
            <Users className="h-8 w-8 text-mata-200" />
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight sm:text-4xl">
              Tem um negócio em Tanguá? Apareça pra cidade toda.
            </h2>
            <p className="mt-3 text-mata-100">
              Reivindique seu perfil gratuitamente, atualize seus dados e poste suas
              novidades direto pro feed de quem está por perto.
            </p>
            <Link
              href="/cadastrar?papel=profissional"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-casca-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-casca-600"
            >
              Cadastrar meu negócio <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
