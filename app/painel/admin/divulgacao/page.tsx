import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { alternarServicoPago, atualizarCompra, salvarServicoPago } from '@/lib/actions/divulgacao-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { InterruptorAcao } from '@/components/painel/admin/interruptor-acao'
import { formatarCentavos } from '@/lib/queries/planos'
import { lerOpcoesServico, linkWhatsappComercial, rotuloPeriodo, ROTULO_STATUS_COMPRA } from '@/lib/divulgacao/servicos'
import { lerConfig } from '@/lib/config/ler'
import { mercadoPagoConfigurado } from '@/lib/pagamentos/mercadopago'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const campo = 'w-full rounded-lg border border-barro-300 bg-superficie px-3 py-2 text-sm'
const POSICOES = [
  ['banner_home', 'Banner na página inicial'],
  ['banner_categoria', 'Banner na categoria do negócio'],
  ['banner_ofertas', 'Banner na página de ofertas'],
  ['destaque_busca', 'Destaque na busca (automático)'],
  ['push', 'Notificação no celular'],
  ['instagram', 'Instagram do Tanguá App'],
  ['evento', 'Evento em destaque'],
  ['vaga', 'Vaga em destaque'],
  ['outro', 'Outro (entrega manual)'],
] as const

const FILTROS = [
  ['producao', 'Para produzir'],
  ['no_ar', 'No ar'],
  ['aguardando_pagamento', 'Aguardando pagamento'],
  ['todas', 'Todas'],
] as const

type Compra = {
  id: string
  servico_id: string
  nome_servico: string
  dias: number
  valor_centavos: number
  status: string
  pago_em: string | null
  inicia_em: string | null
  termina_em: string | null
  arte_url: string | null
  link_destino: string | null
  nota_interna: string | null
  impressoes: number
  cliques: number
  criado_em: string
  negocio: { nome: string; slug: string | null; whatsapp: string | null } | null
  comprador: { nome_completo: string; whatsapp: string | null; telefone: string | null } | null
}

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—')

function FormServico({ s }: { s?: { id: string; nome: string; descricao: string; posicao: string; opcoes: unknown; requer_arte: boolean; ordem: number } }) {
  const opcoesTexto = lerOpcoesServico(s?.opcoes)
    .map((o) => `${o.dias} = ${(o.preco_centavos / 100).toFixed(2).replace('.', ',')}`)
    .join('\n')
  return (
    <FormularioAcao acao={salvarServicoPago} rotuloBotao={s ? 'Salvar' : 'Criar serviço'}>
      <div className="grid gap-3 sm:grid-cols-2">
        {s ? (
          <input type="hidden" name="id" value={s.id} />
        ) : (
          <label className="text-sm">
            <span className="text-barro-600">Identificador</span>
            <input name="id" required pattern="[a-z0-9_]{2,40}" placeholder="ex.: banner_rodape" className={campo} />
          </label>
        )}
        <label className="text-sm">
          <span className="text-barro-600">Nome que o lojista vê</span>
          <input name="nome" required defaultValue={s?.nome} className={campo} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-barro-600">Descrição</span>
          <input name="descricao" maxLength={400} defaultValue={s?.descricao} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Onde aparece</span>
          <select name="posicao" defaultValue={s?.posicao ?? 'outro'} className={campo}>
            {POSICOES.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Ordem na lista</span>
          <input name="ordem" type="number" min={0} max={100} defaultValue={s?.ordem ?? 10} className={campo} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-barro-600">Períodos e preços (um por linha: dias = preço; use 0 para entrega única)</span>
          <textarea name="opcoes" rows={3} defaultValue={opcoesTexto} placeholder={'7 = 49,90\n15 = 89,90\n30 = 149,90'} className={cn(campo, 'font-mono')} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="requer_arte" defaultChecked={s?.requer_arte ?? true} className="h-5 w-5" />
          Precisa combinar arte pelo WhatsApp antes de ir ao ar
        </label>
      </div>
    </FormularioAcao>
  )
}

export default async function PaginaAdminDivulgacao({ searchParams }: { searchParams: { filtro?: string } }) {
  const filtro = FILTROS.some(([f]) => f === searchParams.filtro) ? searchParams.filtro! : 'producao'
  const db = createServiceClient()
  let consulta = db
    .from('compras_servicos')
    .select(
      'id, servico_id, nome_servico, dias, valor_centavos, status, pago_em, inicia_em, termina_em, arte_url, link_destino, nota_interna, impressoes, cliques, criado_em, negocio:negocios(nome, slug, whatsapp), comprador:perfis(nome_completo, whatsapp, telefone)'
    )
    .order('criado_em', { ascending: false })
    .limit(100)
  if (filtro === 'producao') consulta = consulta.eq('status', 'pago')
  else if (filtro !== 'todas') consulta = consulta.eq('status', filtro)

  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)
  const [{ data: servicos }, { data: compras }, { data: pagasMes }, whatsapp] = await Promise.all([
    db.from('servicos_pagos').select('*').order('ordem'),
    consulta,
    db.from('compras_servicos').select('valor_centavos, status').gte('pago_em', inicioMes.toISOString()).in('status', ['pago', 'no_ar', 'encerrada']),
    lerConfig('whatsapp_comercial'),
  ])
  const receitaMes = (pagasMes ?? []).reduce((s, c) => s + c.valor_centavos, 0)
  const lista = (compras ?? []) as unknown as Compra[]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Divulgação paga</h1>
        <p className="mt-1 max-w-3xl text-barro-600">
          O lojista compra sozinho pelo painel e paga no Mercado Pago. Quando o pagamento é aprovado você recebe um aviso, combina a
          arte pelo WhatsApp e põe no ar aqui. O destaque na busca entra no ar sozinho.
        </p>
        {!mercadoPagoConfigurado() && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">MERCADOPAGO_ACCESS_TOKEN não está configurado neste ambiente: ninguém consegue comprar.</p>
        )}
        {!String(whatsapp).replace(/\D/g, '') && (
          <p className="mt-3 rounded-xl bg-casca-50 p-3 text-sm text-casca-900">
            Falta o WhatsApp do time em <Link href="/painel/admin/configuracoes" className="font-bold underline">Configurações → whatsapp_comercial</Link>. Sem
            ele, quem compra não vê o botão de chamar vocês.
          </p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-barro-100 bg-superficie p-4">
            <span className="text-sm text-barro-600">Vendido este mês</span>
            <b className="block font-mono text-2xl text-barro-900">{formatarCentavos(receitaMes)}</b>
          </div>
          <div className="rounded-2xl border border-barro-100 bg-superficie p-4">
            <span className="text-sm text-barro-600">Vendas este mês</span>
            <b className="block font-mono text-2xl text-barro-900">{pagasMes?.length ?? 0}</b>
          </div>
          <div className="rounded-2xl border border-barro-100 bg-superficie p-4">
            <span className="text-sm text-barro-600">Serviços à venda</span>
            <b className="block font-mono text-2xl text-barro-900">{(servicos ?? []).filter((s) => s.ativo).length}</b>
          </div>
        </div>
      </header>

      <section aria-labelledby="titulo-vendas" className="flex flex-col gap-4">
        <h2 id="titulo-vendas" className="font-display text-2xl font-semibold text-barro-900">
          Vendas
        </h2>
        <nav aria-label="Filtrar vendas" className="flex flex-wrap gap-2">
          {FILTROS.map(([f, r]) => (
            <Link
              key={f}
              href={`/painel/admin/divulgacao?filtro=${f}`}
              aria-current={filtro === f ? 'page' : undefined}
              className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold', filtro === f ? 'border-serra bg-serra text-white' : 'border-barro-200 bg-superficie text-barro-800')}
            >
              {r}
            </Link>
          ))}
        </nav>
        {lista.length === 0 && <p className="rounded-2xl border border-dashed border-barro-300 p-6 text-center text-barro-600">Nada aqui por enquanto.</p>}
        {lista.map((c) => {
          const st = ROTULO_STATUS_COMPRA[c.status]
          const zap = c.comprador?.whatsapp || c.negocio?.whatsapp || c.comprador?.telefone
          const linkZap = zap ? linkWhatsappComercial(zap, `Olá! Aqui é do Tanguá App, sobre o seu pedido "${c.nome_servico}" (${c.id.slice(0, 8).toUpperCase()}).`) : null
          return (
            <article key={c.id} className="flex flex-col gap-3 rounded-casca border border-barro-100 bg-superficie p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 font-display text-lg font-semibold text-barro-900">
                  {c.nome_servico} · {c.negocio?.nome ?? 'negócio removido'}
                </h3>
                <span className="rounded-full bg-barro-100 px-2.5 py-1 text-xs font-bold text-barro-800">{st?.texto ?? c.status}</span>
              </div>
              <p className="text-sm text-barro-600">
                {rotuloPeriodo(c.dias)} · {formatarCentavos(c.valor_centavos)} · pedido {c.id.slice(0, 8).toUpperCase()} · pago em {data(c.pago_em)}
                {c.inicia_em && ` · no ar de ${data(c.inicia_em)} a ${data(c.termina_em)}`} · {c.impressoes} visualizações · {c.cliques} cliques
              </p>
              {linkZap && (
                <a href={linkZap} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-mata-700 underline">
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chamar {c.comprador?.nome_completo ?? 'o lojista'} no WhatsApp
                </a>
              )}
              {c.arte_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.arte_url} alt="Arte atual" className="max-h-40 w-auto self-start rounded-xl border border-barro-100" />
              )}
              {['pago', 'no_ar', 'aguardando_pagamento'].includes(c.status) && (
                <FormularioAcao acao={atualizarCompra} rotuloBotao="Salvar">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                      <span className="text-barro-600">Arte (imagem, até 5 MB; banner fica melhor em 1200×400)</span>
                      <input type="file" name="arte" accept="image/*" className={campo} />
                    </label>
                    <label className="text-sm">
                      <span className="text-barro-600">Link ao tocar (vazio = perfil do negócio)</span>
                      <input name="link_destino" defaultValue={c.link_destino ?? ''} placeholder="/negocio/slug ou https://" className={campo} />
                    </label>
                    <label className="text-sm">
                      <span className="text-barro-600">Começa em (vazio = hoje)</span>
                      <input type="date" name="inicia_em" className={campo} />
                    </label>
                    <label className="text-sm">
                      <span className="text-barro-600">Anotação interna</span>
                      <input name="nota_interna" defaultValue={c.nota_interna ?? ''} className={campo} />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {c.status === 'pago' && (
                      <label className="flex min-h-11 items-center gap-2 font-semibold text-mata-800">
                        <input type="radio" name="acao" value="no_ar" className="h-5 w-5" /> Pôr no ar ao salvar
                      </label>
                    )}
                    {c.status === 'no_ar' && (
                      <label className="flex min-h-11 items-center gap-2">
                        <input type="radio" name="acao" value="encerrar" className="h-5 w-5" /> Encerrar agora
                      </label>
                    )}
                    {c.status === 'aguardando_pagamento' && (
                      <label className="flex min-h-11 items-center gap-2">
                        <input type="radio" name="acao" value="cancelar" className="h-5 w-5" /> Cancelar pedido
                      </label>
                    )}
                    <label className="flex min-h-11 items-center gap-2">
                      <input type="radio" name="acao" value="salvar" defaultChecked className="h-5 w-5" /> Só salvar
                    </label>
                  </div>
                </FormularioAcao>
              )}
            </article>
          )
        })}
      </section>

      <section aria-labelledby="titulo-catalogo" className="flex flex-col gap-4">
        <h2 id="titulo-catalogo" className="font-display text-2xl font-semibold text-barro-900">
          O que está à venda
        </h2>
        <p className="text-sm text-barro-600">Ligue só o que vocês conseguem entregar. Desligar tira da vitrine do lojista; compras já feitas continuam valendo.</p>
        {(servicos ?? []).map((s) => (
          <details key={s.id} className="rounded-casca border border-barro-100 bg-superficie p-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
              <span className="min-w-0 flex-1">
                <b className="block text-barro-900">{s.nome}</b>
                <span className="text-sm text-barro-600">
                  {lerOpcoesServico(s.opcoes)
                    .map((o) => `${rotuloPeriodo(o.dias)}: ${formatarCentavos(o.preco_centavos)}`)
                    .join(' · ') || 'sem preço definido'}
                </span>
              </span>
              <InterruptorAcao ligado={s.ativo} acao={alternarServicoPago} campos={{ id: s.id }} rotulo={`Vender ${s.nome}`} />
            </summary>
            <div className="mt-4">
              <FormServico s={s} />
            </div>
          </details>
        ))}
        <details className="rounded-casca border border-dashed border-barro-300 bg-superficie p-5">
          <summary className="cursor-pointer font-semibold text-barro-900">+ Criar outro serviço</summary>
          <div className="mt-4">
            <FormServico />
          </div>
        </details>
      </section>
    </div>
  )
}
