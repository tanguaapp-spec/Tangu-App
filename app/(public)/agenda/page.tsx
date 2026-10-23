import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarPlus, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BotaoInteresse } from '@/components/agenda/botao-interesse'
import { linkGoogleAgenda } from '@/lib/agenda/ics'

export const metadata: Metadata = {
  title: 'Agenda de Tanguá',
  description: 'Eventos, feiras, festas e o que vai acontecer em Tanguá. Salve e receba um lembrete na véspera.',
}
export const dynamic = 'force-dynamic'

type Evento = {
  id: string
  titulo: string
  conteudo: string
  local_evento: string | null
  bairro: string | null
  data_evento: string
}

const fuso = { timeZone: 'America/Sao_Paulo' } as const
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { ...fuso, ...o }).format(new Date(iso))

function rotuloDia(iso: string) {
  const dia = fmt(iso, { year: 'numeric', month: '2-digit', day: '2-digit' })
  const hoje = fmt(new Date().toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit' })
  const amanha = fmt(new Date(Date.now() + 86400e3).toISOString(), { year: 'numeric', month: '2-digit', day: '2-digit' })
  if (dia === hoje) return 'Hoje'
  if (dia === amanha) return 'Amanhã'
  const texto = fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default async function PaginaAgenda() {
  const supabase = createClient()
  const [
    { data },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from('avisos_cidade')
      .select('id, titulo, conteudo, local_evento, bairro, data_evento')
      .eq('ativo', true)
      .eq('tipo', 'evento')
      .gte('data_evento', new Date(Date.now() - 6 * 3600e3).toISOString())
      .order('data_evento', { ascending: true })
      .limit(60),
    supabase.auth.getUser(),
  ])
  const eventos = (data ?? []) as Evento[]
  const ids = eventos.map((e) => e.id)

  const [totais, meus] = await Promise.all([
    Promise.all(ids.map((id) => supabase.rpc('total_interessados', { p_aviso: id }).then((r) => [id, (r.data as number) ?? 0] as const))),
    user && ids.length
      ? supabase.from('interesses_evento').select('aviso_id').eq('perfil_id', user.id).in('aviso_id', ids)
      : Promise.resolve({ data: [] as { aviso_id: string }[] }),
  ])
  const totalPor = new Map(totais)
  const meusIds = new Set((meus.data ?? []).map((m) => m.aviso_id))

  // agrupa por dia
  const grupos: { dia: string; eventos: Evento[] }[] = []
  for (const e of eventos) {
    const dia = rotuloDia(e.data_evento)
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.dia === dia) ultimo.eventos.push(e)
    else grupos.push({ dia, eventos: [e] })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-8 pt-5 md:px-6 md:pt-10">
      <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">Agenda da cidade</h1>
      <p className="mt-1 text-sm text-barro-600 md:text-base">
        O que vai acontecer em Tanguá. Toque em “Tenho interesse” e a gente te lembra na véspera.
      </p>

      {grupos.length === 0 ? (
        <div className="mt-6 rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-6 text-center text-sm text-barro-700">
          Nenhum evento marcado por enquanto. Sabe de algum?{' '}
          <Link href="/mural" className="font-bold text-casca-700 underline">
            Conte no mural da cidade.
          </Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-7">
          {grupos.map((g) => (
            <section key={g.dia} aria-label={g.dia} className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-bold text-barro-900">{g.dia}</h2>
              {g.eventos.map((e, i) => (
                <article
                  key={e.id}
                  id={`evento-${e.id}`}
                  className="flex scroll-mt-24 flex-col gap-3 rounded-[22px] border border-barro-200/80 bg-superficie p-4"
                >
                  <div className="flex gap-3.5">
                    <span
                      className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-[14px] py-1.5 ${
                        i % 2 === 0 ? 'bg-casca-100 text-casca-800' : 'bg-mata-100 text-mata-700'
                      }`}
                    >
                      <b className="text-xl leading-none">{fmt(e.data_evento, { day: '2-digit' })}</b>
                      <span className="text-[11px] font-bold uppercase">{fmt(e.data_evento, { month: 'short' }).replace('.', '')}</span>
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold leading-snug text-barro-900">{e.titulo}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-barro-600">
                        <span className="font-mono">{fmt(e.data_evento, { hour: '2-digit', minute: '2-digit' })}</span>
                        {(e.local_evento || e.bairro) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {[e.local_evento, e.bairro].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {e.conteudo && <p className="whitespace-pre-line text-[15px] leading-relaxed text-barro-800">{e.conteudo}</p>}
                  <div className="flex flex-wrap gap-2">
                    <BotaoInteresse avisoId={e.id} logado={!!user} inicial={meusIds.has(e.id)} total={totalPor.get(e.id) ?? 0} />
                    <a
                      href={`/api/agenda/${e.id}`}
                      className="flex h-11 items-center gap-1.5 rounded-[14px] border-[1.5px] border-barro-200 px-3.5 text-sm font-semibold text-barro-900"
                    >
                      <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Salvar na agenda
                    </a>
                    <a
                      href={linkGoogleAgenda({ titulo: e.titulo, conteudo: e.conteudo, local: e.local_evento, inicio: e.data_evento })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center px-2 text-sm font-semibold text-casca-700 underline-offset-4 hover:underline"
                    >
                      Google Agenda
                    </a>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
