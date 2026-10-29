import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { InterruptorAcao } from '@/components/painel/admin/interruptor-acao'
import { SeletorIcone } from '@/components/painel/admin/seletor-icone'
import { alternarCampoCategoria, moverCategoria, removerCategoria, salvarCategoria } from '@/lib/actions/admin-gestao-actions'
import { iconeCategoria } from '@/lib/ui/icone-categoria'
import type { Categoria } from '@/lib/types/database'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'

export const metadata: Metadata = { title: 'Categorias', robots: { index: false } }
export const dynamic = 'force-dynamic'

const campo = 'h-11 w-full rounded-xl border border-barro-200 bg-superficie px-3 text-sm'

function Formulario({ c, principais }: { c?: Categoria; principais: Categoria[] }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm text-barro-700">
        Nome
        <input name="nome" required defaultValue={c?.nome} placeholder="Ex.: Barbearias" className={campo} />
      </label>
      <label className="flex flex-col gap-1 text-sm text-barro-700">
        Dentro de (deixe vazio para categoria principal)
        <select name="parent_id" defaultValue={c?.parent_id ?? ''} className={campo}>
          <option value="">É uma categoria principal</option>
          {principais
            .filter((p) => p.id !== c?.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
        </select>
      </label>
      <div className="sm:col-span-2">
        <SeletorIcone valorInicial={c?.icone} />
      </div>
    </div>
  )
}

function Linha({ c, uso, principais, sub = false }: { c: Categoria; uso: number; principais: Categoria[]; sub?: boolean }) {
  const Icone = iconeCategoria(c.icone)
  return (
    <details className={`rounded-[18px] border border-barro-200/80 bg-superficie ${c.ativo === false ? 'opacity-60' : ''}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mata-100 text-mata-700">
          <Icone className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-barro-900">{c.nome}</b>
          <span className="text-xs text-barro-600">
            {uso} negócio(s){c.ativo === false && ' · desativada'}
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs text-barro-600">
          {!sub && (
            <span className="flex flex-col items-center gap-0.5">
              <InterruptorAcao ligado={!!c.mostrar_inicio} acao={alternarCampoCategoria} campos={{ id: c.id, campo: 'mostrar_inicio' }} rotulo={`Atalho de ${c.nome} na página inicial`} />
              início
            </span>
          )}
          <span className="flex flex-col items-center gap-0.5">
            <InterruptorAcao ligado={c.ativo !== false} acao={alternarCampoCategoria} campos={{ id: c.id, campo: 'ativo' }} rotulo={`${c.nome} ativa`} />
            ativa
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-3 border-t border-barro-100 p-3">
        <FormularioAcao acao={salvarCategoria.bind(null, c.id)} rotuloBotao="Salvar">
          <Formulario c={c} principais={principais} />
        </FormularioAcao>
        <div className="flex flex-wrap items-center gap-2">
          <FormularioAcao acao={moverCategoria.bind(null, c.id, 'subir')} rotuloBotao="↑ Subir">
            <span />
          </FormularioAcao>
          <FormularioAcao acao={moverCategoria.bind(null, c.id, 'descer')} rotuloBotao="↓ Descer">
            <span />
          </FormularioAcao>
          <Link href={`/categoria/${c.slug}`} target="_blank" className="inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-mata-700 underline">
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> /categoria/{c.slug}
          </Link>
          {uso === 0 && (
            <FormularioAcao acao={removerCategoria.bind(null, c.id)} rotuloBotao="Apagar">
              <span />
            </FormularioAcao>
          )}
        </div>
      </div>
    </details>
  )
}

export default async function PaginaCategorias() {
  const db = createServiceClient()
  const [{ data }, { data: negocios }] = await Promise.all([
    db.from('categorias').select('*').order('ordem'),
    db.from('negocios').select('categoria_id').eq('ativo', true).limit(20000),
  ])
  const categorias = (data ?? []) as Categoria[]
  const uso = new Map<string, number>()
  for (const n of negocios ?? []) if (n.categoria_id) uso.set(n.categoria_id, (uso.get(n.categoria_id) ?? 0) + 1)
  const principais = categorias.filter((c) => !c.parent_id)
  const ativas = principais.filter((c) => c.ativo !== false)
  const desativadas = principais.filter((c) => c.ativo === false)
  const totalFilhas = (id: string) => categorias.filter((c) => c.parent_id === id).reduce((s, c) => s + (uso.get(c.id) ?? 0), 0)

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl font-bold text-barro-900">Categorias</h1>
        <p className="mt-1 text-barro-600">
          Crie só com o nome e um ícone. Subcategoria é uma categoria “dentro de” outra (ex.: Barbearias dentro de Beleza e estética): quem abre
          a principal vê todos os negócios das subcategorias também. “Início” coloca o atalho na página inicial; desativar esconde do app sem
          apagar nada.
        </p>
        <GuiaPagina chave="categorias" />
      </header>

      <section className="rounded-[20px] border border-dashed border-barro-300 bg-superficie p-4">
        <h2 className="mb-3 font-semibold text-barro-900">Nova categoria</h2>
        <FormularioAcao acao={salvarCategoria.bind(null, null)} rotuloBotao="Criar categoria">
          <Formulario principais={ativas} />
        </FormularioAcao>
      </section>

      <ul className="flex flex-col gap-2">
        {ativas.map((m) => {
          const filhas = categorias.filter((f) => f.parent_id === m.id)
          return (
            <li key={m.id} className="flex flex-col gap-2">
              <Linha c={m} uso={(uso.get(m.id) ?? 0) + totalFilhas(m.id)} principais={ativas} />
              {/* subcategorias recolhidas: a lista fica curta e abre só a que interessa */}
              {filhas.length > 0 && (
                <details className="ml-6">
                  <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-mata-700">
                    {filhas.length} subcategoria{filhas.length > 1 ? 's' : ''} de {m.nome}
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    {filhas.map((f) => (
                      <Linha key={f.id} c={f} uso={uso.get(f.id) ?? 0} principais={ativas} sub />
                    ))}
                  </div>
                </details>
              )}
            </li>
          )
        })}
      </ul>

      {desativadas.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-semibold text-barro-700">Desativadas ({desativadas.length})</h2>
          {desativadas.map((c) => (
            <Linha key={c.id} c={c} uso={uso.get(c.id) ?? 0} principais={ativas} />
          ))}
        </section>
      )}
    </div>
  )
}
