import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { marcarNotificacoesLidas } from '@/lib/actions/conta-actions'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Notificações', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaNotificacoes() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/notificacoes')

  const { data: notificacoes } = await supabase
    .from('notificacoes')
    .select('id, titulo, corpo, url, lida_em, criado_em')
    .eq('perfil_id', user.id)
    .order('criado_em', { ascending: false })
    .limit(50)

  const naoLidas = (notificacoes ?? []).filter((n) => !n.lida_em).length

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Notificações</h1>
        {naoLidas > 0 && (
          <form
            action={async () => {
              'use server'
              await marcarNotificacoesLidas()
            }}
          >
            <button className="text-sm font-medium text-casca-700 hover:underline">Marcar todas como lidas</button>
          </form>
        )}
      </div>
      <p className="mt-1 text-sm text-barro-600">
        <Link href="/perfil#comunicacao" className="underline">
          Escolher o que receber
        </Link>
      </p>

      {!notificacoes || notificacoes.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <Bell className="mx-auto h-10 w-10 text-barro-300" aria-hidden="true" />
          <p className="mt-2">Nada por aqui ainda. Favorite negócios pra saber das novidades e ofertas deles.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-barro-100 rounded-xl border border-barro-100 bg-white">
          {notificacoes.map((n) => {
            const conteudo = (
              <>
                <span className="flex items-center gap-2">
                  {!n.lida_em && <span className="h-2 w-2 shrink-0 rounded-full bg-casca-500" aria-label="Não lida" />}
                  <span className={cn('font-medium', n.lida_em ? 'text-barro-700' : 'text-barro-900')}>{n.titulo}</span>
                </span>
                {n.corpo && <span className="mt-0.5 block text-sm text-barro-600">{n.corpo}</span>}
                <span className="mt-1 block text-xs text-barro-400">{new Date(n.criado_em).toLocaleString('pt-BR')}</span>
              </>
            )
            return (
              <li key={n.id}>
                {n.url ? (
                  <Link href={n.url} className="block p-4 hover:bg-barro-50">
                    {conteudo}
                  </Link>
                ) : (
                  <div className="p-4">{conteudo}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
