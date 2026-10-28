import Link from 'next/link'
import { ExternalLink, Flame, MessageCircle, Snowflake, ThermometerSun } from 'lucide-react'
import { buscarLeads } from '@/lib/leads/dados'
import { ETAPAS, SEGMENTOS, type Segmento } from '@/lib/leads/segmentos'
import { atualizarLead } from '@/lib/actions/leads-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Leads', robots: { index: false } }

const TEMP = {
  quente: { rotulo: 'Quente', classe: 'bg-red-100 text-red-800', Icone: Flame },
  morno: { rotulo: 'Morno', classe: 'bg-casca-100 text-casca-900', Icone: ThermometerSun },
  frio: { rotulo: 'Frio', classe: 'bg-sky-100 text-sky-900', Icone: Snowflake },
} as const

const campo = 'w-full rounded-lg border border-barro-300 bg-superficie px-3 py-2 text-sm'

export default async function PaginaLeads({ searchParams }: { searchParams: { lista?: string } }) {
  const segmento = (SEGMENTOS.some((s) => s.chave === searchParams.lista) ? searchParams.lista : 'quente') as Segmento
  const info = SEGMENTOS.find((s) => s.chave === segmento)!
  const linhas = await buscarLeads(segmento)
  const amanha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(Date.now() + 2 * 86400e3))

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Leads</h1>
        <p className="mt-1 max-w-3xl text-barro-600">
          Listas montadas sozinhas a partir do uso do app. Cada contato traz o motivo, quão quente está e a mensagem pronta para o
          WhatsApp. Depois de falar, registre o que aconteceu e marque o próximo retorno.
        </p>
      </header>

      <nav aria-label="Listas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {SEGMENTOS.map((s) => (
          <Link
            key={s.chave}
            href={`/painel/admin/leads?lista=${s.chave}`}
            aria-current={s.chave === segmento ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold',
              s.chave === segmento ? 'border-serra bg-serra text-white' : 'border-barro-200 bg-superficie text-barro-800'
            )}
          >
            {s.titulo}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="titulo-lista" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-lista" className="font-display text-xl font-semibold text-barro-900">
            {info.titulo} <span className="font-mono text-base text-barro-500">({linhas.length})</span>
          </h2>
          <p className="text-sm text-barro-600">{info.descricao}</p>
        </div>

        {linhas.length === 0 && (
          <p className="rounded-2xl border border-dashed border-barro-300 p-6 text-center text-barro-600">Ninguém nesta lista agora.</p>
        )}

        {linhas.map((l) => {
          const t = TEMP[l.temperatura]
          return (
            <article key={l.negocioId} className="flex flex-col gap-3 rounded-casca border border-barro-100 bg-superficie p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 font-display text-lg font-semibold text-barro-900">
                  {l.nome}
                  {l.bairro && <span className="ml-2 text-sm font-normal text-barro-500">{l.bairro}</span>}
                </h3>
                <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', t.classe)}>
                  <t.Icone className="h-3.5 w-3.5" aria-hidden="true" /> {t.rotulo}
                </span>
                {l.lead && (
                  <span className="rounded-full bg-barro-100 px-2.5 py-1 text-xs font-bold text-barro-800">{ETAPAS.find(([e]) => e === l.lead!.etapa)?.[1]}</span>
                )}
              </div>
              <p className="text-sm text-barro-600">
                30 dias: {l.sinais.visitas30d} visitas · {l.sinais.cliquesWhats30d} cliques no WhatsApp · {l.sinais.favoritos30d} favoritos
                {l.lead?.proximo_contato_em && ` · retorno ${l.lead.proximo_contato_em.split('-').reverse().join('/')}`}
              </p>
              <p className="rounded-xl bg-mata-50 p-3 text-sm text-mata-950">
                <b>Sugestão do app:</b> {l.parecer}
              </p>
              {l.lead?.ultimaNota && <p className="text-sm text-barro-700">Última anotação: “{l.lead.ultimaNota}”</p>}
              <div className="flex flex-wrap gap-2">
                {l.linkWhats ? (
                  <a
                    href={l.linkWhats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1F8A4C] px-4 text-sm font-bold text-white"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Chamar no WhatsApp
                  </a>
                ) : (
                  <span className="inline-flex min-h-11 items-center text-sm text-barro-500">Sem telefone cadastrado</span>
                )}
                {l.slug && (
                  <a href={`/negocio/${l.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-barro-200 px-4 text-sm font-semibold text-barro-800">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver perfil
                  </a>
                )}
              </div>
              <details className="rounded-xl border border-barro-100 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-barro-900">Registrar contato</summary>
                <div className="mt-3">
                  <FormularioAcao acao={atualizarLead} rotuloBotao="Salvar contato">
                    <input type="hidden" name="negocio_id" value={l.negocioId} />
                    <input type="hidden" name="origem" value={segmento} />
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="text-sm">
                        <span className="text-barro-600">Etapa</span>
                        <select name="etapa" defaultValue={l.lead?.etapa === 'novo' || !l.lead ? 'contatado' : l.lead.etapa} className={campo}>
                          {ETAPAS.map(([e, r]) => (
                            <option key={e} value={e}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm">
                        <span className="text-barro-600">Próximo retorno</span>
                        <input type="date" name="proximo_contato_em" defaultValue={l.lead?.proximo_contato_em ?? amanha} className={campo} />
                      </label>
                      <label className="text-sm">
                        <span className="text-barro-600">Como foi</span>
                        <select name="tipo" defaultValue="whatsapp" className={campo}>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="nota">Ligação, visita ou outro</option>
                        </select>
                      </label>
                      <label className="text-sm sm:col-span-3">
                        <span className="text-barro-600">O que conversaram</span>
                        <textarea name="nota" rows={2} maxLength={2000} placeholder="Ex.: gostou, pediu para voltar sexta depois do almoço" className={campo} />
                      </label>
                    </div>
                  </FormularioAcao>
                </div>
              </details>
            </article>
          )
        })}
      </section>
    </div>
  )
}
