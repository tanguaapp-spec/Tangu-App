import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { buscarUsoPlano } from '@/lib/queries/planos'
import { CartaoPainel, TituloPainel } from '@/components/painel/titulo-painel'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Estatísticas', robots: { index: false } }
export const dynamic = 'force-dynamic'

const ROTULO_ORIGEM: Record<string, string> = {
  busca: 'Busca e categorias',
  home: 'Página inicial',
  ofertas: 'Ofertas',
  compartilhado: 'Link compartilhado',
  qr: 'QR code / cartaz',
  push: 'Notificação',
  direto: 'Direto / outros',
}

type Evento = { tipo: string; criado_em: string; origem?: string | null }

function diaLocal(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(iso))
}

export default async function PaginaEstatisticas({ searchParams }: { searchParams: { dias?: string } }) {
  const { negocio } = await exigirNegocio('/painel/negocio/estatisticas')
  const uso = await buscarUsoPlano(negocio.id)
  const completas = !!uso?.recursos?.estatisticas_avancadas
  const pedidos = Number(searchParams.dias)
  const dias = completas && [30, 90].includes(pedidos) ? pedidos : 7
  const desde = new Date(Date.now() - dias * 86400e3).toISOString()

  const supabase = createClient()
  const [{ data }, { data: impressoes }] = await Promise.all([
    supabase.from('eventos_perfil').select('*').eq('negocio_id', negocio.id).gte('criado_em', desde).limit(20000),
    supabase.from('impressoes_destaque').select('dia, total').eq('negocio_id', negocio.id).gte('dia', desde.slice(0, 10)),
  ])
  const eventos = (data ?? []) as Evento[]
  const conta = (tipo: string) => eventos.filter((e) => e.tipo === tipo).length
  const visitas = conta('visualizacao')
  const whats = conta('clique_whatsapp')
  const favoritos = conta('favorito')
  const conversao = visitas ? Math.round((whats / visitas) * 100) : 0

  // série diária de visitas
  const serie: { dia: string; n: number }[] = []
  for (let i = dias - 1; i >= 0; i--) serie.push({ dia: diaLocal(new Date(Date.now() - i * 86400e3).toISOString()), n: 0 })
  const porDia = new Map(serie.map((s) => [s.dia, s]))
  for (const e of eventos) {
    const s = e.tipo === 'visualizacao' ? porDia.get(diaLocal(e.criado_em)) : undefined
    if (s) s.n++
  }
  const maximo = Math.max(1, ...serie.map((s) => s.n))

  const origens = new Map<string, number>()
  for (const e of eventos) if (e.tipo === 'visualizacao') origens.set(e.origem ?? 'direto', (origens.get(e.origem ?? 'direto') ?? 0) + 1)
  const listaOrigens = Array.from(origens.entries()).sort((a, b) => b[1] - a[1])
  const totalImpressoes = (impressoes ?? []).reduce((s, i) => s + i.total, 0)

  return (
    <>
      <TituloPainel titulo="Estatísticas" descricao="Números reais do seu perfil. Visita = pessoa diferente abrindo o perfil (no máximo 1 a cada 6h; não conta você nem robôs)." voltar="/painel/negocio/mais" />

      <nav aria-label="Período" className="mb-4 flex gap-2">
        {[7, 30, 90].map((d) => {
          const liberado = d === 7 || completas
          return liberado ? (
            <Link
              key={d}
              href={`/painel/negocio/estatisticas?dias=${d}`}
              aria-current={d === dias ? 'page' : undefined}
              className={cn('flex h-10 items-center rounded-full px-4 text-sm font-semibold', d === dias ? 'bg-serra text-white' : 'border border-barro-200 bg-superficie text-barro-900')}
            >
              {d} dias
            </Link>
          ) : (
            <Link key={d} href="/painel/negocio/assinatura" className="flex h-10 items-center rounded-full border border-dashed border-barro-200 px-4 text-sm font-semibold text-barro-600">
              {d} dias · Profissional
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-4">
        <section className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
          {[
            { r: 'Visitas', v: visitas },
            { r: 'Cliques no WhatsApp', v: whats },
            { r: 'Novos favoritos', v: favoritos },
            { r: 'Visitas que chamaram', v: `${conversao}%` },
          ].map((m) => (
            <div key={m.r} className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
              <p className="text-sm text-barro-600">{m.r}</p>
              <p className="mt-1 font-mono text-[28px] font-bold text-barro-900">{m.v}</p>
            </div>
          ))}
        </section>

        <CartaoPainel titulo="Visitas por dia">
          <div className="flex h-36 items-end gap-[2px]" role="img" aria-label={`Visitas por dia nos últimos ${dias} dias, máximo de ${maximo} num dia`}>
            {serie.map((s) => (
              <div key={s.dia} className="flex h-full flex-1 items-end" title={`${s.dia.split('-').reverse().join('/')}: ${s.n}`}>
                <div className="w-full rounded-t bg-serra" style={{ height: `${(s.n / maximo) * 100}%`, minHeight: s.n ? 3 : 0 }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-barro-600">
            <span>{serie[0].dia.split('-').reverse().slice(0, 2).join('/')}</span>
            <span>hoje</span>
          </div>
        </CartaoPainel>

        <div className="grid gap-4 md:grid-cols-2">
          <CartaoPainel titulo="De onde vêm as visitas">
            {listaOrigens.length === 0 ? (
              <p className="text-sm text-barro-600">Sem visitas no período ainda.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {listaOrigens.map(([o, n]) => (
                  <li key={o}>
                    <div className="flex justify-between text-sm text-barro-900">
                      <span>{ROTULO_ORIGEM[o] ?? o}</span>
                      <span className="font-mono font-bold">{n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-mata-100">
                      <div className="h-full rounded-full bg-laranja" style={{ width: `${Math.round((n / visitas) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-barro-600">Dica: o cartaz com QR (em Divulgar) aparece aqui como “QR code”.</p>
          </CartaoPainel>
          <CartaoPainel titulo="Destaque">
            {negocio.destaque_ativo ? (
              <p className="text-barro-900">
                Seu perfil apareceu <b className="font-mono">{totalImpressoes}</b> {totalImpressoes === 1 ? 'vez' : 'vezes'} em posição de destaque no período.
              </p>
            ) : (
              <p className="text-sm text-barro-700">
                Com o Destaque, seu perfil aparece primeiro na busca e na página inicial, marcado como Destaque.{' '}
                <Link href="/painel/negocio/assinatura" className="font-bold text-casca-700 underline">
                  Ver planos
                </Link>
              </p>
            )}
          </CartaoPainel>
        </div>
        {!completas && (
          <p className="rounded-[14px] bg-casca-100 p-3 text-sm text-barro-900">
            No plano Profissional você vê 30 e 90 dias.{' '}
            <Link href="/painel/negocio/assinatura" className="font-bold underline">
              Comparar planos
            </Link>
          </p>
        )}
      </div>
    </>
  )
}
