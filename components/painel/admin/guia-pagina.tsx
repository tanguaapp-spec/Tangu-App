import Link from 'next/link'
import { Bot, Info, ListOrdered, UserRound } from 'lucide-react'
import { GUIAS, type ChaveGuia, type Guia } from '@/lib/admin/guias'

/** "Como funciona esta tela": o que o app faz sozinho e o que fica com o time. */
export function GuiaPagina({ chave, aberto = false, semManual = false }: { chave: ChaveGuia; aberto?: boolean; semManual?: boolean }) {
  const g: Guia = GUIAS[chave]
  return (
    <details open={aberto} className="group mt-3 rounded-[20px] border border-mata-200 bg-mata-50/60 text-sm">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 font-semibold text-mata-900 [&::-webkit-details-marker]:hidden">
        <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Como funciona esta tela</span>
        <span className="text-xs font-normal text-mata-800 group-open:hidden">ver</span>
        <span className="hidden text-xs font-normal text-mata-800 group-open:inline">fechar</span>
      </summary>
      <div className="flex flex-col gap-4 px-4 pb-4">
        <p className="text-barro-800">{g.resumo}</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Bloco icone={<Bot className="h-4 w-4" aria-hidden="true" />} titulo="O app faz sozinho" itens={g.sozinho} />
          <Bloco icone={<UserRound className="h-4 w-4" aria-hidden="true" />} titulo="O que vocês fazem" itens={g.voces} />
        </div>
        {g.passos && (
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold text-barro-900">
              <ListOrdered className="h-4 w-4" aria-hidden="true" /> Passo a passo
            </h3>
            <ol className="mt-1.5 flex flex-wrap gap-1.5">
              {g.passos.map((p, i) => (
                <li key={p} className="rounded-full bg-superficie px-3 py-1 text-barro-800">
                  <b className="font-mono text-mata-800">{i + 1}.</b> {p}
                </li>
              ))}
            </ol>
          </div>
        )}
        {g.dica && <p className="text-barro-700">{g.dica}</p>}
        {!semManual && (
          <Link href="/painel/admin/como-funciona" className="text-xs font-semibold text-mata-800 underline">
            Ver todos os processos do app
          </Link>
        )}
      </div>
    </details>
  )
}

function Bloco({ icone, titulo, itens }: { icone: React.ReactNode; titulo: string; itens: string[] }) {
  return (
    <div>
      <h3 className="flex items-center gap-1.5 font-semibold text-barro-900">
        {icone} {titulo}
      </h3>
      <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-barro-800">
        {itens.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  )
}
