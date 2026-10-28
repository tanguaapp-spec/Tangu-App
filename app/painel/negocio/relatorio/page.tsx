import type { Metadata } from 'next'
import Link from 'next/link'
import { Download } from 'lucide-react'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { recursoLiberado } from '@/lib/planos/recursos'
import { mesValido, montarRelatorioMensal } from '@/lib/relatorios/mensal'
import { TituloPainel, CartaoPainel } from '@/components/painel/titulo-painel'
import { RecursoBloqueado } from '@/components/painel/recurso-bloqueado'
import { cn } from '@/lib/utils'
import { BotaoImprimir } from '@/components/painel/botao-imprimir'

export const metadata: Metadata = { title: 'Relatório mensal', robots: { index: false } }
export const dynamic = 'force-dynamic'

const nomeMes = (mes: string) =>
  new Date(`${mes}-15T12:00:00Z`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

function variacao(atual: number, anterior: number) {
  if (!anterior) return atual ? 'novo' : null
  const p = Math.round(((atual - anterior) / anterior) * 100)
  return `${p >= 0 ? '+' : ''}${p}% vs. mês anterior`
}

export default async function PaginaRelatorio({ searchParams }: { searchParams: { mes?: string } }) {
  const { negocio, papel } = await exigirNegocio('/painel/negocio/relatorio')
  const liberado = await recursoLiberado(negocio.id, 'relatorio_mensal')
  const agora = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7)
  const mes = mesValido(searchParams.mes) && searchParams.mes! <= agora ? searchParams.mes! : agora
  const meses = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(Number(agora.slice(0, 4)), Number(agora.slice(5, 7)) - 1 - i, 15)).toISOString().slice(0, 7))

  if (!liberado) {
    return (
      <div className="flex flex-col gap-5">
        <TituloPainel titulo="Relatório mensal" descricao="Os números do mês do seu negócio, para baixar em planilha." voltar="/painel/negocio/mais" />
        <RecursoBloqueado recurso="relatorio_mensal" souDono={papel === 'dono'} />
      </div>
    )
  }

  const r = await montarRelatorioMensal(negocio.id, mes)
  const maior = Math.max(1, ...r.dias.map((d) => d.visitas))
  const cards: [string, string | number, string | null][] = [
    ['Visitas ao perfil', r.totais.visitas, variacao(r.totais.visitas, r.mesAnterior.visitas)],
    ['Cliques no WhatsApp', r.totais.whatsapp, variacao(r.totais.whatsapp, r.mesAnterior.whatsapp)],
    ['Novos favoritos', r.totais.favoritos, null],
    ['Pedidos de orçamento', r.totais.orcamentos, null],
    ['Cupons pegos', r.totais.cuponsPegos, null],
    ['Avaliações', r.totais.avaliacoes, r.totais.notaMedia === null ? null : `média ★ ${r.totais.notaMedia.toFixed(1).replace('.', ',')}`],
  ]

  return (
    <div className="flex flex-col gap-5">
      <TituloPainel
        titulo="Relatório mensal"
        descricao="Os números do mês do seu negócio. Baixe a planilha para guardar ou mostrar pra quem trabalha com você."
        voltar="/painel/negocio/mais"
        acao={
          <div className="flex flex-wrap gap-2 print:hidden">
          <BotaoImprimir rotulo="Salvar em PDF" />
          <a href={`/api/painel/relatorio?mes=${mes}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-laranja px-4 font-bold text-tinta">
            <Download className="h-4 w-4" aria-hidden="true" /> Baixar planilha
          </a>
          </div>
        }
      />
      <nav aria-label="Mês" className="-mx-1 flex print:hidden gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {meses.map((m) => (
          <Link
            key={m}
            href={`/painel/negocio/relatorio?mes=${m}`}
            aria-current={m === mes ? 'page' : undefined}
            className={cn('inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold capitalize', m === mes ? 'border-serra bg-serra text-white' : 'border-barro-200 bg-superficie text-barro-800')}
          >
            {nomeMes(m)}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map(([rotulo, valor, detalhe]) => (
          <div key={rotulo} className="rounded-2xl border border-barro-200/80 bg-superficie p-4">
            <span className="text-sm text-barro-600">{rotulo}</span>
            <b className="block font-mono text-2xl text-barro-900">{valor}</b>
            {detalhe && <span className="text-xs text-barro-500">{detalhe}</span>}
          </div>
        ))}
      </div>
      <CartaoPainel titulo="Visitas por dia">
        <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={`Visitas por dia em ${nomeMes(mes)}`}>
          {r.dias.map((d) => (
            <span key={d.dia} title={`${d.dia.slice(8)}: ${d.visitas} visitas`} className="flex-1 rounded-t bg-mata-600" style={{ height: `${Math.max(2, (d.visitas / maior) * 100)}%`, opacity: d.visitas ? 1 : 0.25 }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-xs text-barro-500">
          <span>1</span>
          <span>{r.dias.length}</span>
        </div>
      </CartaoPainel>
      {Object.keys(r.origens).length > 0 && (
        <CartaoPainel titulo="De onde vieram as visitas">
          <ul className="flex flex-col gap-1.5 text-sm">
            {Object.entries(r.origens)
              .sort((a, b) => b[1] - a[1])
              .map(([o, n]) => (
                <li key={o} className="flex justify-between">
                  <span className="capitalize text-barro-800">{o}</span>
                  <b className="font-mono text-barro-900">{n}</b>
                </li>
              ))}
          </ul>
        </CartaoPainel>
      )}
    </div>
  )
}
