import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { removerCategoria, salvarCategoria } from '@/lib/actions/admin-gestao-actions'
import { ICONES_CATEGORIA, iconeCategoria } from '@/lib/ui/icone-categoria'

export const metadata: Metadata = { title: 'Categorias', robots: { index: false } }
export const dynamic = 'force-dynamic'

const campo = 'h-10 rounded-lg border border-barro-200 bg-superficie px-2.5 text-sm'

function Campos({ c }: { c?: { nome: string; slug: string; icone: string | null; ordem: number } }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1.4fr_1.2fr_1fr_80px]">
      <input name="nome" required defaultValue={c?.nome} placeholder="Nome (ex.: Beleza)" aria-label="Nome" className={campo} />
      <input name="slug" required defaultValue={c?.slug} placeholder="endereco-da-categoria" aria-label="Endereço" className={`${campo} font-mono`} />
      <input name="icone" defaultValue={c?.icone ?? ''} placeholder="ícone (scissors)" aria-label="Ícone" list="icones-categoria" className={`${campo} font-mono`} />
      <input name="ordem" type="number" min={0} defaultValue={c?.ordem ?? 0} aria-label="Ordem" className={campo} />
    </div>
  )
}

export default async function PaginaCategorias() {
  const db = createServiceClient()
  const [{ data: categorias }, { data: negocios }] = await Promise.all([
    db.from('categorias').select('id, nome, slug, icone, ordem').order('ordem'),
    db.from('negocios').select('categoria_id').eq('ativo', true),
  ])
  const uso = new Map<string, number>()
  for (const n of negocios ?? []) if (n.categoria_id) uso.set(n.categoria_id, (uso.get(n.categoria_id) ?? 0) + 1)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-barro-900">Categorias</h1>
      <p className="text-barro-600">Aparecem nos atalhos da página inicial (na ordem), no Explorar e em /categoria/endereço. Ícones disponíveis aparecem na lista ao digitar.</p>
      <datalist id="icones-categoria">
        {ICONES_CATEGORIA.map((i) => (
          <option key={i} value={i} />
        ))}
      </datalist>
      <section className="mt-5 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
        <h2 className="mb-2 font-semibold text-barro-900">Nova categoria</h2>
        <FormularioAcao acao={salvarCategoria.bind(null, null)} rotuloBotao="Criar">
          <Campos />
        </FormularioAcao>
      </section>
      <ul className="mt-5 flex flex-col gap-2.5">
        {(categorias ?? []).map((c) => {
          const Icone = iconeCategoria(c.icone)
          return (
            <li key={c.id} className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-barro-700">
                <Icone className="h-4 w-4" aria-hidden="true" /> <b className="text-barro-900">{c.nome}</b> · {uso.get(c.id) ?? 0} negócio(s)
              </div>
              <FormularioAcao acao={salvarCategoria.bind(null, c.id)} rotuloBotao="Salvar">
                <Campos c={c} />
              </FormularioAcao>
              {!uso.get(c.id) && (
                <FormularioAcao acao={removerCategoria.bind(null, c.id)} rotuloBotao="Apagar categoria" className="mt-1">
                  <span />
                </FormularioAcao>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
