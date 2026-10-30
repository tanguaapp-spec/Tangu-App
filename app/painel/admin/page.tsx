import Link from 'next/link'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { metricasCrescimento, metricasFunil, metricasModeracao, metricasReceita, metricasSaude, type PeriodoDias } from '@/lib/queries/admin-metricas'
import { formatarCentavos } from '@/lib/queries/planos'
import { cn } from '@/lib/utils'
import { createServiceClient } from '@/lib/supabase/server'
import { contarLeadsHoje } from '@/lib/leads/dados'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'
import { dataHora } from '@/lib/datas'

export const dynamic = 'force-dynamic'

const PERIODOS: PeriodoDias[] = [7, 30, 90]

function Cartao({ rotulo, valor, detalhe, href, alerta }: { rotulo: string; valor: string | number; detalhe?: string; href?: string; alerta?: boolean }) {
  const conteudo = (
    <>
      <p className={cn('text-2xl font-semibold', alerta ? 'text-red-700' : 'text-barro-900')}>{valor}</p>
      <p className="text-sm text-barro-600">{rotulo}</p>
      {detalhe && <p className="mt-1 text-xs text-barro-400">{detalhe}</p>}
    </>
  )
  const classe = cn('rounded-xl border bg-superficie p-4', alerta ? 'border-red-200' : 'border-barro-100')
  return href ? (
    <Link href={href} className={cn(classe, 'transition-shadow hover:shadow-feira')}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

function Secao({ titulo, children, descricao }: { titulo: string; descricao?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8" aria-label={titulo}>
      <h2 className="font-display text-lg font-semibold text-barro-900">{titulo}</h2>
      {descricao && <p className="text-sm text-barro-500">{descricao}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  )
}

export default async function PainelAdminVisaoGeral({ searchParams }: { searchParams: { periodo?: string } }) {
  const dias = (PERIODOS.includes(Number(searchParams.periodo) as PeriodoDias) ? Number(searchParams.periodo) : 30) as PeriodoDias

  const db = createServiceClient()
  const conta = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0
  const [crescimento, receita, saude, moderacao, funil, vendasProduzir, pedidosOcultar, sugestoes, leadsHoje] = await Promise.all([
    metricasCrescimento(dias),
    metricasReceita(dias),
    metricasSaude(),
    metricasModeracao(),
    metricasFunil(dias),
    conta(db.from('compras_servicos').select('id', { count: 'exact', head: true }).eq('status', 'pago')),
    conta(db.from('pedidos_ocultar').select('id', { count: 'exact', head: true }).eq('status', 'aberto')),
    Promise.all([
      conta(db.from('sugestoes_evento').select('id', { count: 'exact', head: true }).eq('status', 'aberta')),
      conta(db.from('noticias').select('id', { count: 'exact', head: true }).in('status', ['sugerida', 'rascunho'])),
    ]).then(([a, b]) => a + b),
    contarLeadsHoje().catch(() => 0),
  ])

  const integracoes: [string, boolean, string][] = [
    ['Mercado Pago (token + segredo do webhook)', saude.integracoes.mercadoPago, 'Sem isso, planos pagos ficam indisponíveis.'],
    ['Cron (CRON_SECRET)', saude.integracoes.cron, 'Reconciliação, expiração e resumo diário.'],
    ['Web Push (VAPID)', saude.integracoes.webPush, 'Notificações no celular.'],
    ['URL do site (NEXT_PUBLIC_SITE_URL)', saude.integracoes.siteUrl, 'Links de e-mail e retorno do pagamento.'],
    ['Sentry', saude.integracoes.sentry, 'Opcional: alertas de erro em tempo real.'],
  ]

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Visão geral</h1>
          <p className="text-barro-600">
            Operação do Tanguá App, com números direto do banco. Para o diagnóstico completo, veja{' '}
            <Link href="/painel/admin/crescimento" className="font-semibold text-mata-700 underline">Crescimento</Link>.
          </p>
        </div>
        <nav aria-label="Período" className="flex gap-1 rounded-xl bg-superficie p-1 shadow-sm">
          {PERIODOS.map((p) => (
            <Link
              key={p}
              href={`/painel/admin?periodo=${p}`}
              aria-current={p === dias ? 'page' : undefined}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', p === dias ? 'bg-casca-100 text-casca-800' : 'text-barro-600 hover:bg-barro-50')}
            >
              {p} dias
            </Link>
          ))}
        </nav>
      </div>
      <GuiaPagina chave="visao" />

      <Secao titulo="Precisa da sua atenção">
        <Cartao rotulo="Cadastros sinalizados" valor={moderacao.cadastrosPendentes} href="/painel/admin/negocios-pendentes" alerta={moderacao.cadastrosPendentes > 0} />
        <Cartao rotulo="Denúncias pendentes" valor={moderacao.denunciasPendentes} href="/painel/admin/denuncias" alerta={moderacao.denunciasPendentes > 0} />
        <Cartao rotulo="Chamados de suporte abertos" valor={moderacao.chamadosAbertos} href="/painel/admin/suporte" alerta={moderacao.chamadosAbertos > 0} />
        <Cartao rotulo="Reivindicações de perfil" valor={moderacao.reivindicacoesPendentes} href="/painel/admin/reivindicacoes" />
        <Cartao rotulo="Divulgação paga para pôr no ar" valor={vendasProduzir} href="/painel/admin/divulgacao" alerta={vendasProduzir > 0} />
        <Cartao rotulo="Donos pedindo para ocultar o perfil" valor={pedidosOcultar} href="/painel/admin/importar#ocultar" alerta={pedidosOcultar > 0} />
        <Cartao rotulo="Notícias e eventos para revisar" valor={sugestoes} href="/painel/admin/conteudo" />
        <Cartao rotulo="Leads para contatar hoje" valor={leadsHoje} href="/painel/admin/leads?lista=hoje" />
      </Secao>

      <Secao titulo="Crescimento" descricao={`Últimos ${dias} dias, quando indicado.`}>
        <Cartao rotulo="Usuários cadastrados" valor={crescimento.usuarios} detalhe={`+${crescimento.novosUsuarios} no período`} />
        <Cartao rotulo="Moradores ativos" valor={crescimento.usuariosAtivos} detalhe="avaliaram, favoritaram ou reagiram no período" />
        <Cartao rotulo="Negócios no ar" valor={crescimento.negociosAtivos} detalhe={`${crescimento.estabelecimentos} pontos comerciais · ${crescimento.autonomos} autônomos`} />
        <Cartao rotulo="Novos autocadastros" valor={crescimento.novosNegocios} detalhe="no período" />
        <Cartao rotulo="Perfis completos" valor={crescimento.perfisCompletos} detalhe="com WhatsApp, descrição e foto de capa" />
        <Cartao rotulo="Negócios com oferta valendo" valor={crescimento.comOferta} />
      </Secao>

      <Secao
        titulo="Receita"
        descricao="Confirmada = pagamentos aprovados pelo Mercado Pago no período. MRR = projeção mensal das assinaturas ativas (não é dinheiro recebido)."
      >
        <Cartao rotulo="Receita confirmada" valor={formatarCentavos(receita.confirmadaCentavos)} detalhe={`últimos ${dias} dias`} href="/painel/admin/assinaturas" />
        <Cartao rotulo="MRR estimado" valor={formatarCentavos(receita.mrrCentavos)} detalhe={`${receita.pagantes} negócio(s) pagante(s)`} />
        <Cartao rotulo="Pagamentos pendentes" valor={formatarCentavos(receita.pendenteCentavos)} detalhe="aguardando confirmação" />
        <Cartao rotulo="Conversão grátis → pago" valor={`${(receita.conversao * 100).toFixed(1)}%`} />
        <Cartao rotulo="Em atraso" valor={receita.emAtraso} alerta={receita.emAtraso > 0} detalhe={`${receita.recusados} cobrança(s) recusada(s) no período`} />
        <Cartao rotulo="Cancelamentos" valor={receita.cancelamentos} detalhe={`no período${receita.estornadoCentavos ? ` · ${formatarCentavos(receita.estornadoCentavos)} estornados` : ''}`} />
      </Secao>

      {Object.keys(receita.porPlano).length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-barro-100 bg-superficie p-4">
          <table className="w-full text-left text-sm">
            <caption className="mb-2 text-left font-medium text-barro-700">Assinaturas por plano e situação</caption>
            <thead className="text-barro-500">
              <tr>
                <th scope="col" className="py-1 font-medium">Plano</th>
                {['pendente', 'ativa', 'em_atraso', 'cancelada', 'expirada'].map((s) => (
                  <th key={s} scope="col" className="py-1 font-medium">
                    {s.replace('_', ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(receita.porPlano).map(([plano, status]) => (
                <tr key={plano} className="border-t border-barro-100">
                  <th scope="row" className="py-1 font-medium text-barro-800">{plano}</th>
                  {['pendente', 'ativa', 'em_atraso', 'cancelada', 'expirada'].map((s) => (
                    <td key={s} className="py-1">{status[s] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Secao titulo="Saúde do sistema">
        <Cartao rotulo="Erros nas últimas 24h" valor={saude.errosDia} href="/painel/admin/logs" alerta={saude.errosDia > 0} detalhe={`${saude.avisosDia} aviso(s)`} />
        <Cartao rotulo="Webhooks com falha" valor={saude.webhooksFalhos} href="/painel/admin/assinaturas#webhooks" alerta={saude.webhooksFalhos > 0} detalhe="reprocessados pelo cron diário" />
        <Cartao rotulo="Webhooks rejeitados (7 dias)" valor={saude.webhooksInvalidos} detalhe="assinatura HMAC inválida — possível tentativa de fraude" alerta={saude.webhooksInvalidos > 0} />
        <Cartao
          rotulo="Última manutenção (cron)"
          valor={saude.ultimoCron ? dataHora(saude.ultimoCron.criado_em) : 'Nunca rodou'}
          alerta={saude.cronAtrasado}
          detalhe={saude.cronAtrasado ? 'Mais de 26h sem rodar — confira os Cron Jobs na Vercel' : undefined}
        />
      </Secao>

      <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Funil do lojista">
        <div className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <h2 className="font-display text-lg font-bold text-barro-900">Funil do lojista</h2>
          <p className="text-sm text-barro-600">Cadastrados no período e até onde chegaram.</p>
          <ol className="mt-3 flex flex-col gap-2">
            {funil.etapas.map((e, i) => {
              const base = funil.etapas[0].valor || 1
              return (
                <li key={e.rotulo}>
                  <div className="flex justify-between text-sm text-barro-900">
                    <span>{e.rotulo}</span>
                    <span className="font-mono font-bold">
                      {e.valor}
                      {i > 0 && funil.etapas[0].valor > 0 ? ` · ${Math.round((e.valor / base) * 100)}%` : ''}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-mata-100">
                    <div className="h-full rounded-full bg-serra" style={{ width: `${Math.round((e.valor / base) * 100)}%` }} />
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
        <div className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
          <h2 className="font-display text-lg font-bold text-barro-900">De onde vieram os cadastros</h2>
          <p className="text-sm text-barro-600">
            Use links com <code className="font-mono">?origem=</code> (ex.: <code className="font-mono">/cadastrar?origem=instagram</code>).
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {funil.origens.length === 0 && <li className="text-barro-600">Sem cadastros no período.</li>}
            {funil.origens.map(([o, n]) => (
              <li key={o} className="flex justify-between">
                <span className="text-barro-900">{o}</span>
                <span className="font-mono font-bold text-barro-900">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-barro-100 bg-superficie p-4" aria-label="Integrações">
        <h3 className="font-semibold text-barro-800">Integrações configuradas</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {integracoes.map(([nome, ok, detalhe]) => (
            <li key={nome} className="flex items-start gap-2">
              {ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mata-600" aria-label="Configurada" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-label="Não configurada" />
              )}
              <span>
                <span className="font-medium text-barro-800">{nome}</span> <span className="text-barro-500">— {detalhe}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {saude.errosRecentes.length > 0 && (
        <section className="mt-6 rounded-xl border border-red-100 bg-superficie p-4" aria-label="Erros recentes">
          <h3 className="flex items-center gap-2 font-semibold text-barro-800">
            <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" /> Erros recentes
          </h3>
          <ul className="mt-2 divide-y divide-barro-100 text-sm">
            {saude.errosRecentes.map((e) => (
              <li key={e.id} className="py-2">
                <p className="text-barro-800">{e.mensagem.slice(0, 160)}</p>
                <p className="text-xs text-barro-400">
                  {dataHora(e.criado_em)} {e.contexto ? `· ${e.contexto}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
