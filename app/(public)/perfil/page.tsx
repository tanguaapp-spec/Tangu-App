import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  LifeBuoy,
  LogOut,
  ScrollText,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  type LucideIcon,
} from 'lucide-react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Perfil } from '@/lib/types/database'
import { sair } from '@/lib/actions/auth-actions'
import { FormularioPerfil } from '@/components/perfil/formulario-perfil'
import { SelosContribuicao } from '@/components/perfil/selos-contribuicao'
import { CartaoIndicacao } from '@/components/perfil/cartao-indicacao'
import { CartoesFidelidade } from '@/components/perfil/cartoes-fidelidade'
import { PreferenciasComunicacao } from '@/components/perfil/preferencias-comunicacao'
import { PrivacidadeDados } from '@/components/perfil/privacidade-dados'
import { TrocarAvatar } from '@/components/perfil/trocar-avatar'
import { SeletorTema } from '@/components/tema/seletor-tema'
import { buscarSaldoLaranjas } from '@/lib/gamificacao/pontos'
import { buscarCartoesFidelidadeDoUsuario } from '@/lib/queries/negocios'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Você', robots: { index: false } }
export const dynamic = 'force-dynamic'

function Linha({ href, icone: Icone, rotulo, detalhe, destaque }: { href: string; icone: LucideIcon; rotulo: string; detalhe?: string | number | null; destaque?: boolean }) {
  return (
    <Link href={href} className="flex min-h-[56px] items-center gap-3 px-4 text-barro-900 hover:bg-barro-50">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', destaque ? 'bg-casca-100 text-casca-800' : 'bg-mata-100 text-mata-700')}>
        <Icone className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="flex-1 font-semibold">{rotulo}</span>
      {detalhe !== undefined && detalhe !== null && detalhe !== 0 && <span className="font-mono text-sm font-bold text-barro-600">{detalhe}</span>}
      <ChevronRight className="h-[18px] w-[18px] text-barro-400" aria-hidden="true" />
    </Link>
  )
}

function Grupo({ titulo, children }: { titulo?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      {titulo && <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-barro-600">{titulo}</h2>}
      <div className="divide-y divide-barro-100 overflow-hidden rounded-[20px] border border-barro-200/80 bg-superficie">{children}</div>
    </section>
  )
}

function Painel({ id, titulo, descricao, children }: { id?: string; titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-20 overflow-hidden rounded-[20px] border border-barro-200/80 bg-superficie">
      <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-4 font-semibold text-barro-900">
        <span>
          {titulo}
          {descricao && <span className="block text-[13px] font-normal text-barro-600">{descricao}</span>}
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-barro-400 transition-transform group-open:rotate-90" aria-hidden="true" />
      </summary>
      <div className="border-t border-barro-100 p-4">{children}</div>
    </details>
  )
}

export default async function PaginaVoce({ searchParams }: { searchParams: { senha?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: perfil } = user ? await supabase.rpc('meu_perfil').maybeSingle<Perfil>() : { data: null }

  // sem conta: a aba continua útil (tema, ajuda, termos) e convida a entrar
  if (!user || !perfil) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pb-8 pt-6 md:pt-10">
        <div className="flex flex-col gap-3 rounded-[24px] bg-serra p-6 text-white">
          <h1 className="font-display text-2xl font-bold">Você no Tanguá App</h1>
          <p className="text-[15px] text-white/85">
            Com uma conta grátis você salva favoritos, pega cupons, pede orçamentos e recebe aviso das ofertas dos lugares que gosta.
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            <Link href="/entrar?next=/perfil" className="flex h-12 items-center rounded-[14px] bg-laranja px-5 font-bold text-tinta">
              Entrar
            </Link>
            <Link href="/cadastrar" className="flex h-12 items-center rounded-[14px] bg-white/[0.12] px-5 font-bold text-white">
              Criar conta
            </Link>
          </div>
        </div>
        <Link href="/cadastrar?papel=profissional" className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-laranja text-tinta">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-barro-900">Tem um negócio ou trabalha por conta?</b>
            <span className="text-sm text-barro-600">Perfil, catálogo e ofertas grátis.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-barro-400" aria-hidden="true" />
        </Link>
        <Grupo titulo="Aparência">
          <div className="p-4">
            <SeletorTema />
          </div>
        </Grupo>
        <Grupo titulo="Sobre">
          <Linha href="/ajuda" icone={HelpCircle} rotulo="Central de ajuda" />
          <Linha href="/planos" icone={Sparkles} rotulo="Planos para negócios" />
          <Linha href="/privacidade" icone={Shield} rotulo="Privacidade" />
          <Linha href="/termos" icone={ScrollText} rotulo="Termos de uso" />
        </Grupo>
      </div>
    )
  }

  const [
    { count: totalAvaliacoes },
    { count: totalFavoritos },
    { count: totalIndicados },
    { count: cuponsAtivos },
    { count: naoLidas },
    { count: produtosSalvos },
    saldoLaranjas,
    cartoesFidelidade,
    { data: negocioProprio },
    { data: membro },
    { data: ehAdmin },
    { data: ehCrescimento },
  ] = await Promise.all([
    supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
    supabase.from('favoritos').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id),
    createServiceClient().from('perfis').select('id', { count: 'exact', head: true }).eq('convidado_por', user.id),
    supabase.from('cupom_resgates').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id).is('usado_em', null),
    supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id).is('lida_em', null),
    supabase.from('favoritos_produtos').select('*', { count: 'exact', head: true }).eq('perfil_id', user.id),
    buscarSaldoLaranjas(user.id),
    buscarCartoesFidelidadeDoUsuario(user.id),
    supabase.from('negocios').select('id, nome').eq('reivindicado_por', user.id).order('criado_em'),
    supabase.from('membros_negocio').select('negocio:negocios(id, nome)').eq('perfil_id', user.id).limit(1).maybeSingle(),
    supabase.rpc('eh_admin'),
    supabase.rpc('eh_crescimento'),
  ])
  const proprios = (negocioProprio ?? []) as { id: string; nome: string }[]
  const negocio = proprios[0] ?? ((membro as { negocio?: { id: string; nome: string } } | null)?.negocio ?? null)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pb-8 pt-5 md:pt-10">
      <header className="flex items-center gap-4">
        <TrocarAvatar url={perfil.avatar_url} nome={perfil.nome_completo} />
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-barro-900">{perfil.nome_completo}</h1>
          <p className="text-sm text-barro-600">
            {perfil.bairro ? `${perfil.bairro} · ` : ''}
            <span className="font-mono font-bold text-casca-700">{saldoLaranjas}</span> {saldoLaranjas === 1 ? 'laranja' : 'laranjas'}
          </p>
        </div>
      </header>

      {searchParams.senha === 'alterada' && (
        <p role="status" className="rounded-[14px] bg-mata-100 p-3 text-sm font-semibold text-mata-700">
          Senha alterada com sucesso.
        </p>
      )}

      {ehAdmin !== true && ehCrescimento === true && (
        <Link href="/painel/crescimento" className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-barro-900 text-feira">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-barro-900">Painel de crescimento</b>
            <span className="text-sm text-barro-600">Métricas do app e clientes para contatar</span>
          </span>
          <ChevronRight className="h-5 w-5 text-barro-400" aria-hidden="true" />
        </Link>
      )}

      {ehAdmin === true && (
        <Link href="/painel/admin" className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-barro-900 text-feira">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-barro-900">Painel do administrador</b>
            <span className="text-sm text-barro-600">Logs de erro, cadastros, denúncias e pagamentos</span>
          </span>
          <ChevronRight className="h-5 w-5 text-barro-400" aria-hidden="true" />
        </Link>
      )}

      {negocio ? (
        <Link href="/painel/negocio" className="flex items-center gap-3 rounded-[22px] bg-serra p-4 text-white">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-laranja text-tinta">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] text-white/75">{proprios.length > 1 ? `Seus ${proprios.length} negócios` : 'Seu negócio'}</span>
            <b className="block truncate text-lg">{proprios.length > 1 ? proprios.map((n) => n.nome).join(' · ') : negocio.nome}</b>
          </span>
          <span className="shrink-0 font-bold">Abrir painel</span>
        </Link>
      ) : (
        <Link href="/painel/negocio/cadastrar" className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-laranja text-tinta">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex-1">
            <b className="block text-barro-900">Tem um negócio ou trabalha por conta?</b>
            <span className="text-sm text-barro-600">Anuncie grátis: perfil, catálogo e ofertas.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-barro-400" aria-hidden="true" />
        </Link>
      )}

      <Grupo>
        <Linha href="/favoritos" icone={Heart} rotulo="Favoritos" detalhe={(totalFavoritos ?? 0) + (produtosSalvos ?? 0)} />
        <Linha href="/ofertas" icone={Ticket} rotulo="Seus cupons" detalhe={cuponsAtivos} destaque />
        <Linha href="/orcamentos" icone={FileText} rotulo="Seus orçamentos" />
        <Linha href="/notificacoes" icone={Bell} rotulo="Notificações" detalhe={naoLidas} />
        <Linha href="/agenda" icone={CalendarDays} rotulo="Agenda da cidade" />
        <Linha href="/bem-vindo" icone={Bookmark} rotulo="Seus interesses" />
      </Grupo>

      {cartoesFidelidade.length > 0 && <CartoesFidelidade cartoes={cartoesFidelidade as never} />}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-barro-600">Seus selos</h2>
        <SelosContribuicao totalAvaliacoes={totalAvaliacoes ?? 0} totalFavoritos={totalFavoritos ?? 0} />
      </section>

      {perfil.codigo_convite && <CartaoIndicacao codigoConvite={perfil.codigo_convite} totalIndicados={totalIndicados ?? 0} />}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-[13px] font-bold uppercase tracking-wide text-barro-600">Conta</h2>
        <Painel titulo="Dados pessoais" descricao="Nome, telefone e bairro">
          <FormularioPerfil perfil={perfil} />
        </Painel>
        <Painel id="comunicacao" titulo="Comunicação" descricao="Quais avisos você quer receber">
          <PreferenciasComunicacao
            preferencias={(perfil as Perfil & { preferencias_notificacao?: Record<string, boolean> }).preferencias_notificacao ?? null}
            resumoDiario={perfil.notificacoes_resumo_diario ?? true}
          />
          <Link href="/bem-vindo" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-mata-700 underline">
            Escolher as categorias que me interessam
          </Link>
        </Painel>
        <Painel titulo="Aparência" descricao="Claro, escuro ou automático">
          <SeletorTema />
        </Painel>
        <Painel id="privacidade" titulo="Privacidade e dados" descricao="Baixar seus dados ou excluir a conta">
          <PrivacidadeDados temNegocio={proprios.length > 0} />
        </Painel>
      </section>

      <Grupo titulo="Ajuda">
        <Linha href="/ajuda" icone={HelpCircle} rotulo="Central de ajuda" />
        <Linha href="/ajuda/chamados" icone={LifeBuoy} rotulo="Seus chamados" />
        <Linha href="/privacidade" icone={Shield} rotulo="Privacidade" />
        <Linha href="/termos" icone={ScrollText} rotulo="Termos de uso" />
      </Grupo>

      <form action={sair}>
        <button className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-barro-200 font-semibold text-barro-800 hover:bg-barro-50">
          <LogOut className="h-4 w-4" aria-hidden="true" /> Sair da conta
        </button>
      </form>
    </div>
  )
}
