import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { agruparErros, type RegistroErro } from '@/lib/admin/agrupar-erros'
import { AcoesErro } from '@/components/painel/admin/acoes-erro'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Logs de erro', robots: { index: false } }
export const dynamic = 'force-dynamic'

const FILTROS = [
  { valor: 'abertos', rotulo: 'Abertos' },
  { valor: 'resolvidos', rotulo: 'Resolvidos' },
  { valor: 'todos', rotulo: 'Todos' },
] as const

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Explicação em português pros erros mais comuns: o que é e o que fazer. */
function dica(mensagem: string, contextos: string[]) {
  const m = `${mensagem} ${contextos.join(' ')}`.toLowerCase()
  if (m.includes('mercado pago') || m.includes('webhook')) return 'Cobrança: confira o painel do Mercado Pago e as credenciais na Vercel. O cron de assinaturas reconcilia sozinho uma vez por dia.'
  if (m.includes('cron')) return 'Tarefa automática diária: veja em Vercel → Cron Jobs se rodou e se o CRON_SECRET está configurado.'
  if (m.includes('fetch failed') || m.includes('network') || m.includes('timeout')) return 'Instabilidade de rede/serviço externo. Se parou de acontecer, pode marcar como resolvido.'
  if (m.includes('chunk') || m.includes('loading css')) return 'Navegador com versão antiga do app em cache depois de um deploy. Some sozinho quando a pessoa recarrega.'
  if (m.includes('client (error boundary)') || m.includes('error boundary')) return 'Erro na tela de alguém. Veja a página afetada e os detalhes técnicos; copie e mande pra quem desenvolve.'
  return 'Copie os detalhes e mande pra quem desenvolve, junto com o que a pessoa estava fazendo.'
}

export default async function PainelLogs({ searchParams }: { searchParams: { filtro?: string; q?: string; dias?: string } }) {
  const filtro = FILTROS.some((f) => f.valor === searchParams.filtro) ? searchParams.filtro! : 'abertos'
  const dias = [1, 7, 30, 90].includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 30
  // layout de /painel/admin já garante que é admin; service role pra não depender da regra antiga de RLS
  const db = createServiceClient()
  const { data, error } = await db
    .from('error_logs')
    .select('*')
    .gte('criado_em', new Date(Date.now() - dias * 86400e3).toISOString())
    .order('criado_em', { ascending: false })
    .limit(2000)
  const registros = (data ?? []) as RegistroErro[]
  const semColunaResolvido = registros.length > 0 && !('resolvido_em' in registros[0])

  const nomes = new Map<string, string>()
  const idsUsuarios = Array.from(new Set(registros.map((r) => r.usuario_id).filter(Boolean))) as string[]
  if (idsUsuarios.length) {
    const { data: perfis } = await db.from('perfis').select('id, nome_completo').in('id', idsUsuarios.slice(0, 200))
    for (const p of perfis ?? []) nomes.set(p.id, p.nome_completo)
  }

  const termo = (searchParams.q ?? '').toLowerCase().trim()
  const todos = agruparErros(registros)
  const grupos = todos
    .filter((g) => (filtro === 'abertos' ? !g.resolvido : filtro === 'resolvidos' ? g.resolvido : true))
    .filter((g) => !termo || `${g.mensagem} ${g.contextos.join(' ')} ${g.urls.join(' ')}`.toLowerCase().includes(termo))
  const abertos = todos.filter((g) => !g.resolvido)
  const ocorrenciasAbertas = abertos.reduce((s, g) => s + g.total, 0)
  const hoje = registros.filter((r) => Date.now() - new Date(r.criado_em).getTime() < 86400e3).length

  const url = (muda: Record<string, string>) => {
    const q = new URLSearchParams({ filtro, dias: String(dias), ...(termo ? { q: termo } : {}), ...muda })
    return `/painel/admin/logs?${q.toString()}`
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-barro-900">Logs de erro</h1>
      <p className="text-barro-600">
        Erros que aconteceram no app (na tela de alguém, nos pagamentos, nas tarefas automáticas). Erros iguais aparecem juntos. Resolva aqui e anote o que foi feito.
      </p>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">Não foi possível ler os logs: {error.message}</p>}
      {semColunaResolvido && (
        <p className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">
          Rode a migration <b>0021_logs_admin.sql</b> no Supabase pra poder marcar erros como resolvidos.
        </p>
      )}

      <section aria-label="Resumo" className="mt-5 grid grid-cols-3 gap-2.5">
        {[
          { r: 'Erros abertos', v: abertos.length, alerta: abertos.length > 0 },
          { r: 'Ocorrências abertas', v: ocorrenciasAbertas, alerta: false },
          { r: 'Últimas 24h', v: hoje, alerta: hoje > 0 },
        ].map((m) => (
          <div key={m.r} className={cn('rounded-[18px] border p-3', m.alerta ? 'border-red-200 bg-red-50' : 'border-barro-200/80 bg-superficie')}>
            <p className="font-mono text-2xl font-bold text-barro-900">{m.v}</p>
            <p className="text-xs text-barro-700">{m.r}</p>
          </div>
        ))}
      </section>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Link
            key={f.valor}
            href={url({ filtro: f.valor })}
            aria-current={filtro === f.valor ? 'page' : undefined}
            className={cn('flex h-10 items-center rounded-full px-4 text-sm font-semibold', filtro === f.valor ? 'bg-serra text-white' : 'border border-barro-200 bg-superficie text-barro-900')}
          >
            {f.rotulo}
          </Link>
        ))}
        <span className="mx-1 h-6 w-px bg-barro-200" aria-hidden="true" />
        {[1, 7, 30, 90].map((d) => (
          <Link
            key={d}
            href={url({ dias: String(d) })}
            aria-current={dias === d ? 'page' : undefined}
            className={cn('flex h-10 items-center rounded-full px-3 font-mono text-xs font-bold', dias === d ? 'bg-barro-900 text-feira' : 'border border-barro-200 bg-superficie text-barro-900')}
          >
            {d === 1 ? '24h' : `${d}d`}
          </Link>
        ))}
        <form method="get" className="ml-auto flex min-w-[200px] flex-1 gap-2 sm:flex-none">
          <input type="hidden" name="filtro" value={filtro} />
          <input type="hidden" name="dias" value={dias} />
          <input name="q" defaultValue={searchParams.q} placeholder="Buscar na mensagem ou página" aria-label="Buscar erro" className="h-10 min-w-0 flex-1 rounded-xl border border-barro-200 bg-superficie px-3 text-sm" />
        </form>
      </div>

      {grupos.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 text-center text-barro-600">
          <ShieldCheck className="h-10 w-10 text-mata-600" aria-hidden="true" />
          <p>{filtro === 'abertos' ? 'Nenhum erro aberto neste período. Tudo em dia!' : 'Nada encontrado com esses filtros.'}</p>
        </div>
      ) : (
        <ul className="mt-5 flex flex-col gap-3">
          {grupos.map((g) => {
            const usuarios = registros
              .filter((r) => g.ids.includes(r.id) && r.usuario_id)
              .map((r) => nomes.get(r.usuario_id!) ?? 'conta removida')
            const pessoas = Array.from(new Set(usuarios)).slice(0, 5)
            const relatorio = [
              `Erro: ${g.mensagem}`,
              `Nível: ${g.nivel} · ${g.total} ocorrência(s) · ${g.usuarios} pessoa(s)`,
              `Primeira: ${fmt(g.primeiro)} · Última: ${fmt(g.ultimo)}`,
              g.contextos.length ? `Onde: ${g.contextos.join(', ')}` : null,
              g.urls.length ? `Páginas: ${g.urls.join(', ')}` : null,
              g.stack ? `\n${g.stack}` : null,
            ]
              .filter(Boolean)
              .join('\n')
            return (
              <li key={g.chave} className={cn('rounded-[20px] border bg-superficie p-4', g.resolvido ? 'border-barro-200/80 opacity-80' : g.nivel === 'warning' ? 'border-yellow-300' : 'border-red-200')}>
                <div className="flex items-start gap-2.5">
                  {g.resolvido ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-mata-600" aria-label="Resolvido" />
                  ) : (
                    <AlertTriangle className={cn('mt-0.5 h-5 w-5 shrink-0', g.nivel === 'warning' ? 'text-yellow-600' : 'text-red-600')} aria-label={g.nivel === 'warning' ? 'Aviso' : 'Erro'} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold text-barro-900">{g.mensagem}</p>
                    <p className="mt-1 text-sm text-barro-600">
                      <b className="font-mono text-barro-900">{g.total}×</b> · última {fmt(g.ultimo)}
                      {g.total > 1 && ` · primeira ${fmt(g.primeiro)}`}
                      {g.usuarios > 0 && ` · ${g.usuarios} ${g.usuarios === 1 ? 'pessoa' : 'pessoas'}`}
                    </p>
                    {(g.contextos.length > 0 || g.urls.length > 0) && (
                      <p className="mt-1 break-words text-sm text-barro-700">
                        {g.contextos.slice(0, 3).join(', ')}
                        {g.contextos.length > 0 && g.urls.length > 0 && ' · '}
                        {g.urls.slice(0, 3).map((u) => (
                          <code key={u} className="mr-1 rounded bg-feira px-1.5 py-0.5 font-mono text-xs">
                            {u}
                          </code>
                        ))}
                      </p>
                    )}
                    {pessoas.length > 0 && <p className="mt-1 text-xs text-barro-600">Com: {pessoas.join(', ')}</p>}
                    {g.resolvido ? (
                      <p className="mt-2 text-sm text-mata-700">
                        Resolvido em {fmt(g.resolvidoEm!)}
                        {g.nota ? ` — ${g.nota}` : ''}
                      </p>
                    ) : (
                      <p className="mt-2 rounded-xl bg-feira p-2.5 text-sm text-barro-800">{dica(g.mensagem, g.contextos)}</p>
                    )}
                    {g.stack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold text-barro-700">Detalhes técnicos</summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-feira p-3 font-mono text-xs text-barro-800">{g.stack}</pre>
                      </details>
                    )}
                    <div className="mt-3">
                      <AcoesErro ids={g.ids} resolvido={g.resolvido} relatorio={relatorio} />
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
