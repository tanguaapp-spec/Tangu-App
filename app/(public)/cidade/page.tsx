import type { Metadata } from 'next'
import Link from 'next/link'
import { Briefcase, CalendarDays, ChevronRight, FileText, Map, MessagesSquare, Newspaper, Phone, type LucideIcon } from 'lucide-react'
import { lerConfig } from '@/lib/config/ler'

export const metadata: Metadata = {
  title: 'Tanguá: o que acontece na cidade',
  description: 'Agenda, notícias, serviços úteis, mapa, vagas e mural de Tanguá num lugar só.',
}
export const revalidate = 300

const ATALHOS: { href: string; titulo: string; detalhe: string; icone: LucideIcon; modulo?: string }[] = [
  { href: '/agenda', titulo: 'Agenda', detalhe: 'Eventos, feiras e festas', icone: CalendarDays },
  { href: '/noticias', titulo: 'Notícias', detalhe: 'Prefeitura e novidades da cidade', icone: Newspaper, modulo: 'noticias' },
  { href: '/servicos-uteis', titulo: 'Serviços úteis', detalhe: 'Emergência, farmácia de plantão, coleta', icone: Phone, modulo: 'servicos_uteis' },
  { href: '/mapa', titulo: 'Mapa', detalhe: 'Comércios perto de você', icone: Map, modulo: 'mapa' },
  { href: '/vagas', titulo: 'Vagas de emprego', detalhe: 'Trabalhe perto de casa', icone: Briefcase, modulo: 'vagas' },
  { href: '/mural', titulo: 'Mural', detalhe: 'Recados e perguntas entre vizinhos', icone: MessagesSquare, modulo: 'mural' },
  { href: '/orcamentos/novo', titulo: 'Pedir orçamento', detalhe: 'Vários profissionais respondem', icone: FileText, modulo: 'orcamentos' },
]

/** Tudo da cidade num lugar só (no celular, a barra de baixo fica pros atalhos principais). */
export default async function PaginaCidade() {
  const modulos = await lerConfig('modulos_ativos')
  const itens = ATALHOS.filter((a) => !a.modulo || modulos[a.modulo] !== false)
  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Na cidade</h1>
      <p className="mt-1 text-sm text-barro-600 md:text-base">O que acontece em Tanguá, num lugar só.</p>
      <ul className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
        {itens.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="flex min-h-[72px] items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mata-100 text-mata-700">
                <a.icone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-barro-900">{a.titulo}</b>
                <span className="text-sm text-barro-600">{a.detalhe}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-barro-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
