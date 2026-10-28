import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BarChart3,
  Briefcase,
  ChevronRight,
  CreditCard,
  Eye,
  LifeBuoy,
  LogOut,
  Megaphone,
  QrCode,
  CalendarX,
  ShoppingBag,
  FileSpreadsheet,
  Plus,
  Sparkles,
  Rocket,
  ShieldCheck,
  Stamp,
  Star,
  Store,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { createClient } from '@/lib/supabase/server'
import { sair } from '@/lib/actions/auth-actions'
import { urlNegocio } from '@/lib/ui/apresentacao'
import { SeletorTema } from '@/components/tema/seletor-tema'
import { TituloPainel } from '@/components/painel/titulo-painel'

export const metadata: Metadata = { title: 'Mais', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Item = { href: string; rotulo: string; detalhe: string; icone: LucideIcon; externo?: boolean; soDono?: boolean }

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Seu perfil',
    itens: [
      { href: '/painel/negocio/perfil', rotulo: 'Perfil do negócio', detalhe: 'Nome, contato, horário e fotos', icone: Store },
      { href: '/painel/negocio/horarios', rotulo: 'Feriados e horários especiais', detalhe: 'Avise quando abrir diferente', icone: CalendarX },
      { href: '/painel/negocio/vendas', rotulo: 'Pedidos e agenda pelo WhatsApp', detalhe: 'Carrinho no catálogo e pedido de horário', icone: ShoppingBag },
      { href: '/painel/negocio/novidades', rotulo: 'Novidades', detalhe: 'Publique e avise quem favoritou', icone: Megaphone },
      { href: '/painel/negocio/avaliacoes', rotulo: 'Avaliações', detalhe: 'Leia e responda', icone: Star },
    ],
  },
  {
    titulo: 'Crescer',
    itens: [
      { href: '/painel/negocio/estatisticas', rotulo: 'Estatísticas', detalhe: 'Visitas, WhatsApp e de onde vêm', icone: BarChart3 },
      { href: '/painel/negocio/relatorio', rotulo: 'Relatório mensal', detalhe: 'Planilha com os números do mês', icone: FileSpreadsheet },
      { href: '/painel/negocio/divulgacao', rotulo: 'Anunciar no Tanguá App', detalhe: 'Banner, destaque na busca e Instagram', icone: Rocket },
      { href: '/painel/negocio/divulgar', rotulo: 'Divulgar', detalhe: 'QR code, cartaz e indicação', icone: QrCode },
      { href: '/painel/negocio/fidelidade', rotulo: 'Cartão fidelidade', detalhe: 'Carimbe quem volta', icone: Stamp },
      { href: '/painel/negocio/vagas', rotulo: 'Vagas', detalhe: 'Contrate gente da cidade', icone: Briefcase },
    ],
  },
  {
    titulo: 'Conta',
    itens: [
      { href: '/painel/negocio/equipe', rotulo: 'Equipe', detalhe: 'Quem ajuda a cuidar do perfil', icone: Users },
      { href: '/painel/negocio/assinatura', rotulo: 'Plano e assinatura', detalhe: 'Limites, pagamento e recibos', icone: CreditCard, soDono: true },
      { href: '/painel/negocio/cadastrar', rotulo: 'Cadastrar outro negócio', detalhe: 'Cuide de vários negócios na mesma conta', icone: Plus, soDono: true },
      { href: '/ferramentas', rotulo: 'Ferramentas completas', detalhe: 'Beloo (agenda) e Freguês (pedidos)', icone: Sparkles },
      { href: '/ajuda', rotulo: 'Ajuda e suporte', detalhe: 'Dúvidas e chamados', icone: LifeBuoy },
      { href: '/perfil', rotulo: 'Sua conta pessoal', detalhe: 'Favoritos, cupons e preferências', icone: User },
    ],
  },
]

export default async function PaginaMais() {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/mais')
  const { data: ehAdmin } = await createClient().rpc('eh_admin')
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <TituloPainel titulo="Mais" voltar={null} />
      {ehAdmin === true && (
        <Link href="/painel/admin" className="flex items-center gap-3 rounded-[20px] bg-barro-900 p-4 text-feira">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1">
            <b className="block">Painel do administrador</b>
            <span className="text-sm opacity-80">Logs de erro, cadastros, denúncias e pagamentos</span>
          </span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      )}
      <a
        href={urlNegocio(negocio)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-[20px] bg-serra p-4 text-white"
      >
        <Eye className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1 font-semibold">Ver meu perfil como o cliente vê</span>
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </a>
      {GRUPOS.map((g) => (
        <section key={g.titulo} className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-barro-600">{g.titulo}</h2>
          <div className="divide-y divide-barro-100 overflow-hidden rounded-[20px] border border-barro-200/80 bg-superficie">
            {g.itens
              .filter((i) => !i.soDono || papel === 'dono')
              .map((i) => (
                <Link key={i.href} href={i.href} className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-barro-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mata-100 text-mata-700">
                    <i.icone className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block text-barro-900">{i.rotulo}</b>
                    <span className="block truncate text-[13px] text-barro-600">{i.detalhe}</span>
                  </span>
                  <ChevronRight className="h-[18px] w-[18px] text-barro-400" aria-hidden="true" />
                </Link>
              ))}
          </div>
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-barro-600">Aparência</h2>
        <div className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <SeletorTema />
        </div>
      </section>
      <form action={sair}>
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-barro-200 font-semibold text-barro-800">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
        </button>
      </form>
    </div>
  )
}
