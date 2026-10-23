import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, Clock3, Image as IconeImagem, Inbox, Package, QrCode, Send, ShieldAlert, Store, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buscarCategorias, buscarDesempenhoSemanal } from '@/lib/queries/negocios'
import { buscarUsoPlano, listarPlanos } from '@/lib/queries/planos'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { montarChecklistNegocio, progressoChecklist } from '@/lib/onboarding/checklist-negocio'
import { CHAVES_LIMITE, ROTULO_LIMITE, formatarLimite, situacaoLimite } from '@/lib/planos/limites'
import { reenviarCadastroNegocio } from '@/lib/actions/painel-negocio-actions'
import { FormularioEditarNegocio } from '@/components/painel/formulario-editar-negocio'
import { BotaoSino } from '@/components/layout/botao-sino'
import { ProvedorSessao } from '@/components/layout/sessao'
import { urlNegocio } from '@/lib/ui/apresentacao'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const fuso = 'America/Sao_Paulo'

function saudacao() {
  const h = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: fuso, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function variacao(atual: number, anterior: number) {
  if (atual === 0 && anterior === 0) return { texto: 'sem movimento ainda', tom: 'neutro' as const }
  if (anterior === 0) return { texto: `+${atual} na semana`, tom: 'alta' as const }
  const pct = Math.round(((atual - anterior) / anterior) * 100)
  if (pct === 0) return { texto: 'igual à semana passada', tom: 'neutro' as const }
  return { texto: `${pct > 0 ? '+' : ''}${pct}% vs semana passada`, tom: pct > 0 ? ('alta' as const) : ('baixa' as const) }
}

function quando(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 60) return `há ${Math.max(1, min)} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

const ICONE_PASSO: Record<string, typeof Store> = { galeria: IconeImagem, capa: IconeImagem, produto: Package, oferta: Tag, novidade: Send }

export default async function PainelNegocio() {
  const { user, negocio, papel } = await negocioDoPainel()
  if (!user) redirect('/entrar?next=/painel/negocio')

  if (!negocio) {
    return (
      <div className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-3 rounded-[24px] border border-barro-200/80 bg-superficie p-8 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-laranja text-tinta">
          <Store className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="font-display text-2xl font-bold text-barro-900">Coloque seu negócio no app</h1>
        <p className="text-barro-700">
          Perfil, catálogo com preço, ofertas e WhatsApp direto. Serve pra loja e pra quem trabalha por conta própria — sem precisar de endereço.
        </p>
        <Link href="/painel/negocio/cadastrar" className="mt-2 flex h-12 w-full items-center justify-center rounded-[14px] bg-laranja font-bold text-tinta">
          Cadastrar grátis
        </Link>
        <Link href="/buscar" className="text-sm font-semibold text-casca-700 underline">
          Meu negócio já aparece no app (reivindicar)
        </Link>
      </div>
    )
  }

  const supabase = createClient()

  if (negocio.status_cadastro !== 'aprovado') {
    const rejeitado = negocio.status_cadastro === 'rejeitado'
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <div className={cn('flex flex-col items-center gap-2 rounded-[24px] p-7 text-center', rejeitado ? 'bg-red-50' : 'bg-casca-100')}>
          {rejeitado ? <ShieldAlert className="h-10 w-10 text-red-700" aria-hidden="true" /> : <Clock3 className="h-10 w-10 text-casca-800" aria-hidden="true" />}
          <h1 className="font-display text-2xl font-bold text-barro-900">{negocio.nome}</h1>
          {rejeitado ? (
            <>
              <p className="text-barro-800">Seu cadastro não foi aprovado desta vez.</p>
              {negocio.motivo_rejeicao && (
                <p className="rounded-[14px] bg-superficie p-3 text-sm text-barro-800">
                  <b>Motivo:</b> {negocio.motivo_rejeicao}
                </p>
              )}
              <form
                action={async () => {
                  'use server'
                  await reenviarCadastroNegocio(negocio.id)
                }}
              >
                <button className="mt-2 h-12 rounded-[14px] bg-laranja px-5 font-bold text-tinta">Ajustei os dados, reenviar</button>
              </form>
            </>
          ) : (
            <>
              <p className="text-barro-800">
                Seu cadastro caiu numa verificação automática e vai ser olhado por uma pessoa, normalmente em até 2 dias úteis. Tudo que você preencher
                abaixo já vale quando ele for liberado.
              </p>
              <Link href="/ajuda/contato?assunto=cadastro" className="text-sm font-semibold text-casca-800 underline">
                Acha que foi engano? Fale com o suporte
              </Link>
            </>
          )}
        </div>
        <section className="rounded-[24px] border border-barro-200/80 bg-superficie p-5">
          <h2 className="mb-4 font-display text-lg font-bold text-barro-900">Enquanto isso, complete seu perfil</h2>
          <FormularioEditarNegocio negocio={negocio as never} categorias={(await buscarCategorias()) as never} />
        </section>
      </div>
    )
  }

  const seteDias = new Date(Date.now() - 7 * 86400e3).toISOString()
  const [
    { count: totalProdutos },
    { count: totalPosts },
    { data: cupons },
    desempenho,
    uso,
    planos,
    { data: pedidos },
    { data: respondidos },
  ] = await Promise.all([
    supabase.from('produtos_servicos').select('id', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
    supabase.from('posts_negocio').select('id', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
    supabase.from('cupons').select('id').eq('negocio_id', negocio.id),
    buscarDesempenhoSemanal(negocio.id),
    buscarUsoPlano(negocio.id),
    listarPlanos(),
    supabase
      .from('pedido_destinatarios')
      .select('visto_em, criado_em, pedido:pedidos_orcamento(id, titulo, bairro, status, expira_em)')
      .eq('negocio_id', negocio.id)
      .order('criado_em', { ascending: false })
      .limit(20),
    supabase.from('respostas_orcamento').select('pedido_id').eq('negocio_id', negocio.id),
  ])

  const idsCupons = (cupons ?? []).map((c) => c.id)
  const { data: resgates } = idsCupons.length
    ? await supabase.from('cupom_resgates').select('usado_em').in('cupom_id', idsCupons).gte('criado_em', seteDias)
    : { data: [] as { usado_em: string | null }[] }
  const cuponsPegos = resgates?.length ?? 0
  const cuponsUsados = (resgates ?? []).filter((r) => r.usado_em).length

  const checklist = montarChecklistNegocio({
    tipo_perfil: negocio.tipo_perfil ?? 'estabelecimento',
    descricao: negocio.descricao,
    categoria_id: negocio.categoria_id,
    whatsapp: negocio.whatsapp,
    bairro: negocio.bairro,
    endereco: negocio.endereco,
    area_atendimento: negocio.area_atendimento ?? null,
    horario_funcionamento: negocio.horario_funcionamento,
    foto_capa_url: negocio.foto_capa_url,
    galeria: negocio.galeria,
    total_produtos: totalProdutos ?? 0,
    total_posts: totalPosts ?? 0,
    total_cupons: idsCupons.length,
  })
  const progresso = progressoChecklist(checklist)
  const feitos = checklist.filter((i) => i.feito).length

  const jaRespondi = new Set((respondidos ?? []).map((r) => r.pedido_id))
  type LinhaPedido = { visto_em: string | null; criado_em: string; pedido: { id: string; titulo: string; bairro: string | null; status: string; expira_em: string } | null }
  const linhasPedidos = ((pedidos ?? []) as unknown as LinhaPedido[]).filter((l) => l.pedido)
  const aguardando = linhasPedidos.filter((l) => !jaRespondi.has(l.pedido!.id) && l.pedido!.status === 'aberto' && new Date(l.pedido!.expira_em) > new Date())
  const nomePlano = planos.find((p) => p.id === uso?.plano)?.nome ?? 'Gratuito'
  const primeiroNome = (user.user_metadata?.nome_completo as string | undefined)?.split(' ')[0]

  const metricas = [
    { rotulo: 'visitas', longo: 'Visitas ao perfil', valor: desempenho.visualizacoes.atual, v: variacao(desempenho.visualizacoes.atual, desempenho.visualizacoes.anterior) },
    { rotulo: 'WhatsApp', longo: 'Cliques no WhatsApp', valor: desempenho.cliquesWhatsapp.atual, v: variacao(desempenho.cliquesWhatsapp.atual, desempenho.cliquesWhatsapp.anterior) },
    { rotulo: 'cupons', longo: 'Cupons pegos', valor: cuponsPegos, v: { texto: `${cuponsUsados} ${cuponsUsados === 1 ? 'usado' : 'usados'}`, tom: 'neutro' as const } },
    { rotulo: 'favoritos', longo: 'Novos favoritos', valor: desempenho.favoritos.atual, v: { texto: 'avisados a cada oferta', tom: 'neutro' as const }, soComputador: true },
  ]

  const acoes = [
    { href: '/painel/negocio/ofertas#nova', rotulo: 'Nova oferta', icone: Tag, principal: true },
    { href: '/painel/negocio/novidades', rotulo: 'Publicar novidade', icone: Send },
    { href: '/painel/negocio/catalogo#novo', rotulo: 'Produto ou serviço', icone: Package },
    { href: '/painel/negocio/ofertas#validar', rotulo: 'Validar cupom', icone: QrCode },
  ]
  const IconeProximo = progresso.proximo ? ICONE_PASSO[progresso.proximo.id] ?? Store : Store

  return (
    <ProvedorSessao>
      <div className="flex flex-col gap-3.5 md:gap-[22px]">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-barro-600 md:text-base">
              <span className="md:hidden">{papel === 'dono' ? 'Seu negócio' : 'Você ajuda a cuidar de'}</span>
              <span className="hidden md:inline">
                {saudacao()}
                {primeiroNome ? `, ${primeiroNome}` : ''}
              </span>
            </p>
            <h1 className="truncate font-display text-2xl font-bold text-barro-900 md:text-[32px]">{negocio.nome}</h1>
          </div>
          <Link href="/painel/negocio/assinatura" className="rounded-full bg-casca-100 px-3 py-1.5 text-xs font-bold text-casca-800 md:hidden">
            Plano {nomePlano}
          </Link>
          <div className="hidden items-center gap-2.5 md:flex">
            <BotaoSino />
            <a
              href={urlNegocio(negocio)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-4 font-semibold text-barro-900"
            >
              Ver como o cliente vê
            </a>
            <Link href="/painel/negocio/ofertas#nova" className="flex h-11 items-center rounded-[14px] bg-laranja px-4 font-bold text-tinta">
              Nova oferta
            </Link>
          </div>
        </header>

        {progresso.proximo && (
          <section aria-label="Configuração do perfil" className="flex flex-col gap-3 rounded-[24px] bg-serra p-[18px] text-white md:flex-row md:flex-wrap md:items-center md:gap-5 md:rounded-[28px] md:p-6">
            <div className="flex flex-col gap-3 md:flex-[1_1_260px] md:gap-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-lg font-bold md:text-[22px]">Seu perfil está {progresso.percentual}% pronto</span>
                <span className="font-mono text-[13px] text-white/75 md:hidden">
                  {feitos}/{checklist.length}
                </span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={progresso.percentual}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Conclusão do perfil"
                className="h-2 overflow-hidden rounded-full bg-white/[0.18] md:h-2.5"
              >
                <div className="h-full rounded-full bg-laranja" style={{ width: `${progresso.percentual}%` }} />
              </div>
              <span className="hidden text-sm text-white/75 md:block">Calculado do que está preenchido de verdade. Some quando chegar a 100%.</span>
            </div>
            <Link href={progresso.proximo.href} className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 md:flex-[1_1_320px] md:rounded-[18px] md:p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-laranja text-tinta md:h-10 md:w-10">
                <IconeProximo className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
              <span className="text-sm leading-snug">
                <b>Próximo: {progresso.proximo.titulo.charAt(0).toLowerCase() + progresso.proximo.titulo.slice(1)}.</b> {progresso.proximo.beneficio}
              </span>
            </Link>
          </section>
        )}

        <section aria-label="Últimos 7 dias" className="grid grid-cols-3 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] md:gap-3.5">
          {metricas.map((m) => (
            <div key={m.rotulo} className={cn('rounded-[18px] border border-barro-200/80 bg-superficie p-3 md:rounded-[22px] md:p-[18px]', m.soComputador && 'hidden md:block')}>
              <p className="hidden text-sm text-barro-600 md:block">{m.longo}</p>
              <p className="font-mono text-2xl font-bold text-barro-900 md:mt-1.5 md:text-[30px]">{m.valor}</p>
              <p className="text-xs text-barro-600 md:hidden">{m.rotulo}</p>
              <p
                className={cn(
                  'mt-1.5 text-xs font-bold md:mt-1 md:text-[13px]',
                  m.v.tom === 'alta' ? 'text-mata-600' : m.v.tom === 'baixa' ? 'text-casca-800' : 'font-semibold text-barro-600'
                )}
              >
                {m.v.texto}
              </p>
            </div>
          ))}
        </section>
        <p className="-mt-1 text-xs text-barro-600 md:-mt-3">
          Últimos 7 dias. Visita = pessoa diferente abrindo seu perfil (sem contar você nem robôs).{' '}
          <Link href="/painel/negocio/estatisticas" className="font-semibold text-casca-700 underline">
            Ver estatísticas
          </Link>
        </p>

        {/* celular: atalho dos pedidos */}
        <Link href="/painel/negocio/orcamentos" className="flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie px-4 py-3.5 md:hidden">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-mata-100 text-mata-700">
            <Inbox className="h-[22px] w-[22px]" aria-hidden="true" />
            {aguardando.length > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-laranja px-1 font-mono text-xs font-bold text-tinta">
                {aguardando.length}
              </span>
            )}
          </span>
          <span className="flex-1">
            <b className="block text-barro-900">
              {aguardando.length === 0 ? 'Pedidos de orçamento' : `${aguardando.length} ${aguardando.length === 1 ? 'pedido' : 'pedidos'} de orçamento`}
            </b>
            <span className="text-[13px] text-barro-600">{aguardando.length ? 'Responder rápido faz diferença' : 'Nenhum esperando resposta'}</span>
          </span>
          <ChevronRight className="h-[18px] w-[18px] text-barro-600" aria-hidden="true" />
        </Link>

        <section aria-label="Ações rápidas" className="grid grid-cols-2 gap-2.5 md:hidden">
          {acoes.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={cn(
                'flex h-[76px] flex-col justify-between rounded-[18px] p-3 font-bold',
                a.principal ? 'bg-laranja text-tinta' : 'border border-barro-200/80 bg-superficie text-barro-900'
              )}
            >
              <a.icone className="h-[22px] w-[22px]" aria-hidden="true" />
              {a.rotulo}
            </Link>
          ))}
        </section>

        {/* computador: pedidos + plano lado a lado */}
        <div className="hidden flex-wrap gap-[18px] md:flex">
          <section aria-labelledby="t-orc" className="flex min-w-0 flex-[999_1_380px] flex-col gap-3 rounded-[24px] border border-barro-200/80 bg-superficie p-5">
            <div className="flex items-baseline justify-between">
              <h2 id="t-orc" className="font-display text-xl font-bold text-barro-900">
                Pedidos de orçamento
              </h2>
              <Link href="/painel/negocio/orcamentos" className="font-bold text-casca-700">
                Ver todos
              </Link>
            </div>
            {linhasPedidos.length === 0 ? (
              <p className="text-sm text-barro-600">Nenhum pedido ainda. Perfis completos, com catálogo e fotos, recebem mais pedidos.</p>
            ) : (
              linhasPedidos.slice(0, 4).map((l) => {
                const respondido = jaRespondi.has(l.pedido!.id)
                return (
                  <Link key={l.pedido!.id} href={`/painel/negocio/orcamentos/${l.pedido!.id}`} className="flex items-center gap-3 rounded-2xl bg-feira p-3 text-barro-900">
                    <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', respondido ? 'bg-barro-200' : 'bg-laranja')} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate">{l.pedido!.titulo}</b>
                      <span className="text-[13px] text-barro-600">
                        {l.pedido!.bairro ? `${l.pedido!.bairro} · ` : ''}
                        {quando(l.criado_em)}
                      </span>
                    </span>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-bold', respondido ? 'bg-mata-100 text-mata-700' : 'bg-casca-100 text-casca-800')}>
                      {respondido ? 'Respondido' : 'Aguardando você'}
                    </span>
                  </Link>
                )
              })
            )}
          </section>

          {uso && (
            <section aria-labelledby="t-plano" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[24px] border border-barro-200/80 bg-superficie p-5">
              <div className="flex items-baseline justify-between">
                <h2 id="t-plano" className="font-display text-xl font-bold text-barro-900">
                  Plano {nomePlano}
                </h2>
                <Link href="/painel/negocio/assinatura" className="font-bold text-casca-700">
                  Ver planos
                </Link>
              </div>
              {CHAVES_LIMITE.map((c) => {
                const { uso: usado, limite } = uso.limites[c]
                const s = situacaoLimite(usado, limite)
                return (
                  <div key={c}>
                    <div className="flex justify-between text-sm text-barro-900">
                      <span>{ROTULO_LIMITE[c].curto}</span>
                      <span className="font-mono font-bold">
                        {usado}/{formatarLimite(limite)}
                      </span>
                    </div>
                    {limite !== null && (
                      <div className="mt-1.5 h-1.5 rounded-full bg-mata-100">
                        <div
                          className={cn('h-full rounded-full', s === 'cheio' ? 'bg-red-600' : s === 'perto' ? 'bg-yellow-400' : 'bg-serra')}
                          style={{ width: `${Math.min(100, Math.round((usado / limite) * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </section>
          )}
        </div>
      </div>
    </ProvedorSessao>
  )
}
