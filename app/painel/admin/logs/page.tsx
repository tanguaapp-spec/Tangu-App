import { createClient } from '@/lib/supabase/server'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

export default async function PainelLogs() {
  await requireAdminOrRedirect()
  const supabase = createClient()

  const { data: logs } = await supabase
    .from('error_logs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(100)

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">
        Logs de erro
      </h1>
      <p className="text-barro-600">
        Últimos 100 erros registrados (client e server). Não substitui uma ferramenta como o Sentry, mas já evita depender só de alguém reportar.
      </p>

      {!logs || logs.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <ShieldAlert className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhum erro registrado. Tudo em dia!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-casca border border-barro-100 bg-white p-4 shadow-feira">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-4 w-4 shrink-0 ${log.nivel === 'warning' ? 'text-casca-500' : 'text-red-500'}`}
                  />
                  <p className="font-medium text-barro-900">{log.mensagem}</p>
                </div>
                <span className="shrink-0 text-xs text-barro-400">
                  {formatDistanceToNow(new Date(log.criado_em), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              {(log.contexto || log.url) && (
                <p className="mt-1.5 text-sm text-barro-500">
                  {log.contexto && <span>{log.contexto}</span>}
                  {log.contexto && log.url && ' · '}
                  {log.url && <span className="break-all">{log.url}</span>}
                </p>
              )}
              {log.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-barro-400 hover:text-barro-600">
                    Ver stack trace
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-barro-50 p-3 text-xs text-barro-700">
                    {log.stack}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
