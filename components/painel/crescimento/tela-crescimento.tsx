import Link from 'next/link'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'
import { AlertTriangle, CheckCircle2, CircleDashed, OctagonAlert } from 'lucide-react'
import { buscarDadosCrescimento } from '@/lib/crescimento/dados'
import { montarPainel, type Situacao } from '@/lib/crescimento/metricas'
import { registrarInvestimento } from '@/lib/actions/crescimento-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { cn } from '@/lib/utils'
import { dataCurta } from '@/lib/datas'


const ESTILO: Record<Situacao, { rotulo: string; classe: string; Icone: typeof CheckCircle2 }> = {
  bom: { rotulo: 'Saudável', classe: 'bg-mata-100 text-mata-800', Icone: CheckCircle2 },
  atencao: { rotulo: 'Atenção', classe: 'bg-casca-100 text-casca-900', Icone: AlertTriangle },
  critico: { rotulo: 'Gargalo', classe: 'bg-red-100 text-red-800', Icone: OctagonAlert },
  sem_dados: { rotulo: 'Poucos dados', classe: 'bg-barro-100 text-barro-700', Icone: CircleDashed },
}

const campo = 'w-full rounded-lg border border-barro-300 bg-superficie px-3 py-2 text-sm'

/** Painel de crescimento, usado no admin e na área de crescimento. */
export async function TelaCrescimento({ linkLeads }: { linkLeads: string }) {
  const dados = await buscarDadosCrescimento()
  const { categorias, gargalo, resumo } = montarPainel(dados)
  const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Crescimento</h1>
        <p className="mt-1 max-w-3xl text-barro-600">
          Os 7 sinais de saúde de um SaaS, calculados com os dados reais do app. Cada bloco diz o que está acontecendo e o que fazer.
          Os contatos para trabalhar ficam em{' '}
          <Link href={linkLeads} className="font-semibold text-mata-700 underline">
            Leads
          </Link>
          .
        </p>
        <GuiaPagina chave="crescimento" semManual={!linkLeads.startsWith('/painel/admin')} />
      </header>

      <section
        aria-label="Parecer do app"
        className={cn(
          'rounded-[24px] p-5 md:p-6',
          gargalo ? (gargalo.situacao === 'critico' ? 'bg-red-50 text-red-900' : 'bg-casca-50 text-casca-900') : 'bg-mata-50 text-mata-900'
        )}
      >
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Parecer do app</span>
        <p className="mt-1 font-display text-xl font-semibold leading-snug md:text-2xl">{resumo}</p>
      </section>

      <nav aria-label="Etapas" className="flex flex-wrap gap-2">
        {categorias.map((c, i) => {
          const e = ESTILO[c.situacao]
          return (
            <a key={c.chave} href={`#${c.chave}`} className={cn('inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold', e.classe)}>
              <span className="font-mono text-xs opacity-70">{i + 1}</span> {c.titulo}
            </a>
          )
        })}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        {categorias.map((c, i) => {
          const e = ESTILO[c.situacao]
          return (
            <section key={c.chave} id={c.chave} className="flex scroll-mt-20 flex-col gap-4 rounded-casca border border-barro-100 bg-superficie p-5">
              <header className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-xs text-barro-500">
                    {i + 1} · {c.pergunta}
                  </span>
                  <h2 className="font-display text-xl font-semibold text-barro-900">{c.titulo}</h2>
                </div>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', e.classe)}>
                  <e.Icone className="h-3.5 w-3.5" aria-hidden="true" /> {e.rotulo}
                </span>
              </header>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {c.indicadores.map((ind) => (
                  <div key={ind.rotulo} className="min-w-0 rounded-xl bg-barro-50 p-3">
                    <dt className="text-xs text-barro-600">{ind.rotulo}</dt>
                    <dd className="mt-0.5 font-mono text-lg font-bold text-barro-900">{ind.valor}</dd>
                    <dd className="mt-0.5 text-xs leading-snug text-barro-500">{ind.ajuda}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-col gap-1 border-t border-barro-100 pt-3 text-sm">
                <p className="text-barro-900">{c.parecer}</p>
                <p className="text-barro-700">
                  <b>O que fazer:</b> {c.acao}
                </p>
              </div>
            </section>
          )
        })}
      </div>

      {dados.comentariosNps.length > 0 && (
        <section className="rounded-casca border border-barro-100 bg-superficie p-5">
          <h2 className="font-display text-xl font-semibold text-barro-900">O que as pessoas disseram</h2>
          <ul className="mt-3 flex flex-col divide-y divide-barro-100">
            {dados.comentariosNps.map((c, i) => (
              <li key={i} className="flex gap-3 py-3">
                <span
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-mono font-bold',
                    c.nota >= 9 ? 'bg-mata-100 text-mata-800' : c.nota >= 7 ? 'bg-barro-100 text-barro-800' : 'bg-red-100 text-red-800'
                  )}
                >
                  {c.nota}
                </span>
                <p className="min-w-0 text-sm text-barro-800">
                  {c.comentario}
                  <span className="block text-xs text-barro-500">
                    {c.publico === 'negocio' ? 'Dono de negócio' : 'Morador'} · {dataCurta(c.criado_em)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-casca border border-barro-100 bg-superficie p-5">
        <h2 className="font-display text-xl font-semibold text-barro-900">Investimento em divulgação</h2>
        <p className="mt-1 text-sm text-barro-600">Lance o que foi gasto para atrair clientes (anúncio, panfleto, brinde). Sem isso o CAC fica em branco.</p>
        <div className="mt-4">
          <FormularioAcao acao={registrarInvestimento} rotuloBotao="Lançar investimento">
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-sm sm:col-span-2">
                <span className="text-barro-600">Onde</span>
                <input name="canal" required placeholder="Anúncio no Instagram" className={campo} />
              </label>
              <label className="text-sm">
                <span className="text-barro-600">Valor (R$)</span>
                <input name="valor" required inputMode="decimal" placeholder="150,00" className={campo} />
              </label>
              <label className="text-sm">
                <span className="text-barro-600">Data</span>
                <input name="mes" type="date" required defaultValue={hoje} className={campo} />
              </label>
            </div>
          </FormularioAcao>
        </div>
      </section>
    </div>
  )
}
