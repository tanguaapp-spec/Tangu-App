import type { Metadata } from 'next'
import Link from 'next/link'
import { Bot, Clock, UserRound } from 'lucide-react'
import { FLUXOS, GUIAS, ROTINAS } from '@/lib/admin/guias'

export const metadata: Metadata = { title: 'Como o app funciona', robots: { index: false } }

/** Manual da operação: cada pedido de usuário de ponta a ponta, rotinas automáticas e o papel de cada aba. */
export default function PaginaComoFunciona() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-barro-900">Como o app funciona</h1>
        <p className="mt-1 text-barro-600">
          O manual da operação. Para cada pedido de morador ou lojista: o que o app resolve sozinho, o que fica com vocês e em qual aba. Toda
          aba do painel tem também um quadro &quot;Como funciona esta tela&quot; no topo.
        </p>
      </header>

      <section aria-labelledby="t-fluxos" className="flex flex-col gap-3">
        <h2 id="t-fluxos" className="font-display text-xl font-bold text-barro-900">
          Quando o usuário pede algo
        </h2>
        {FLUXOS.map((f) => (
          <article key={f.titulo} className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold text-barro-900">{f.titulo}</h3>
              <Link href={f.onde.href} className="text-sm font-semibold text-mata-800 underline">
                {f.onde.rotulo}
              </Link>
            </div>
            <p className="text-sm text-barro-600">Quem pede: {f.quem}</p>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
              <Lista icone={<Bot className="h-4 w-4" aria-hidden="true" />} titulo="O app faz sozinho" itens={f.sozinho} />
              <Lista icone={<UserRound className="h-4 w-4" aria-hidden="true" />} titulo="O que vocês fazem" itens={f.voces} />
            </div>
          </article>
        ))}
      </section>

      <section aria-labelledby="t-rotinas" className="flex flex-col gap-3">
        <h2 id="t-rotinas" className="font-display text-xl font-bold text-barro-900">
          Tarefas automáticas de todo dia
        </h2>
        <ul className="flex flex-col gap-2">
          {ROTINAS.map((r) => (
            <li key={r.quando} className="flex gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-4 text-sm">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-mata-700" aria-hidden="true" />
              <span>
                <b className="text-barro-900">{r.quando}:</b> <span className="text-barro-800">{r.oque}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-barro-600">O que cada rotina fez fica registrado na Auditoria; se algo falhar, aparece em Logs de erro.</p>
      </section>

      <section aria-labelledby="t-abas" className="flex flex-col gap-3">
        <h2 id="t-abas" className="font-display text-xl font-bold text-barro-900">
          Para que serve cada aba
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.values(GUIAS).map((g) => (
            <li key={g.href}>
              <Link href={g.href} className="block h-full rounded-[20px] border border-barro-200/80 bg-superficie p-4 text-sm">
                <b className="text-barro-900">{g.titulo}</b>
                <span className="mt-1 block text-barro-700">{g.resumo}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function Lista({ icone, titulo, itens }: { icone: React.ReactNode; titulo: string; itens: string[] }) {
  return (
    <div>
      <h4 className="flex items-center gap-1.5 font-semibold text-barro-900">
        {icone} {titulo}
      </h4>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-barro-800">
        {itens.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
