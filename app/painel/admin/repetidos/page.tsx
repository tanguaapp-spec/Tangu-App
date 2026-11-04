import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { apagarRepetido, ocultarRepetido } from '@/lib/actions/repetidos-actions'
import { agruparDuplicados } from '@/lib/negocios/duplicados'
import { dataCurta } from '@/lib/datas'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Repetidos', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Negocio = {
  id: string
  nome: string
  slug: string | null
  whatsapp: string | null
  telefone: string | null
  bairro: string | null
  reivindicado_por: string | null
  criado_em: string
  status_cadastro: string
  ativo: boolean
  origem: string | null
}

const ROTULO_ORIGEM: Record<string, string> = { cadastro_manual: 'cadastrado pelo lojista', importado: 'colocado pela equipe' }

/** Todos os negócios, de 1.000 em 1.000 (limite de cada consulta). */
async function todosNegocios(db: ReturnType<typeof createServiceClient>) {
  const lista: Negocio[] = []
  for (let de = 0; de < 20000; de += 1000) {
    const { data } = await db
      .from('negocios')
      .select('id, nome, slug, whatsapp, telefone, bairro, reivindicado_por, criado_em, status_cadastro, ativo, origem')
      .neq('status_cadastro', 'rejeitado')
      .order('criado_em')
      .range(de, de + 999)
    lista.push(...((data ?? []) as Negocio[]))
    if (!data || data.length < 1000) break
  }
  return lista
}

export default async function PaginaRepetidos() {
  const db = createServiceClient()
  // ocultados como repetido já resolvidos: saem da lista
  const negocios = (await todosNegocios(db)).filter((n) => n.ativo)
  const grupos = agruparDuplicados(negocios)
  const ids = grupos.flatMap((g) => g.itens.map((n) => n.id))
  const donos = Array.from(new Set(grupos.flatMap((g) => g.itens.map((n) => n.reivindicado_por)).filter((x): x is string => !!x)))

  const vazio = ['00000000-0000-0000-0000-000000000000']
  const [{ data: perfis }, { data: aval }, { data: fav }, { data: prod }] = await Promise.all([
    db.from('perfis').select('id, nome_completo').in('id', donos.length ? donos : vazio),
    db.from('avaliacoes').select('negocio_id').in('negocio_id', ids.length ? ids : vazio),
    db.from('favoritos').select('negocio_id').in('negocio_id', ids.length ? ids : vazio),
    db.from('produtos_servicos').select('negocio_id').in('negocio_id', ids.length ? ids : vazio),
  ])
  const nomeDono = new Map((perfis ?? []).map((p) => [p.id as string, p.nome_completo as string]))
  const contar = (linhas: { negocio_id: string }[] | null) => {
    const m = new Map<string, number>()
    for (const l of linhas ?? []) m.set(l.negocio_id, (m.get(l.negocio_id) ?? 0) + 1)
    return m
  }
  const nAval = contar(aval as { negocio_id: string }[])
  const nFav = contar(fav as { negocio_id: string }[])
  const nProd = contar(prod as { negocio_id: string }[])
  const porNome = grupos.filter((g) => g.motivo === 'nome')
  const porTelefone = grupos.filter((g) => g.motivo === 'telefone')

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold text-barro-900">Repetidos</h1>
        <p className="text-barro-600">
          Negócios que parecem o mesmo: nome igual (sem contar acento, maiúscula e pontuação) ou o mesmo telefone. Escolha qual fica e apague ou
          oculte os outros.
        </p>
        <GuiaPagina chave="repetidos" />
      </header>

      {grupos.length === 0 && (
        <p className="rounded-[20px] border border-dashed border-barro-200 p-5 text-sm text-barro-600">Nenhum negócio repetido no app. 🎉</p>
      )}

      {[
        ['Mesmo nome', porNome, 'Quase sempre é o mesmo negócio cadastrado mais de uma vez.'],
        ['Mesmo telefone, nome diferente', porTelefone, 'Pode ser normal (a mesma pessoa com dois negócios). Confira antes de mexer.'],
      ].map(([titulo, lista, ajuda]) =>
        (lista as typeof grupos).length ? (
          <section key={titulo as string} className="flex flex-col gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-barro-900">
                {titulo as string} <span className="font-mono text-base text-barro-500">({(lista as typeof grupos).length})</span>
              </h2>
              <p className="text-sm text-barro-600">{ajuda as string}</p>
            </div>
            {(lista as typeof grupos).map((g) => (
              <article key={`${g.motivo}-${g.chave}`} className="flex flex-col gap-2 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
                <b className="text-barro-900">
                  {g.itens[0].nome} <span className="text-sm font-normal text-barro-600">· {g.itens.length} perfis</span>
                </b>
                <ul className="flex flex-col divide-y divide-barro-100">
                  {g.itens.map((n, i) => {
                    const vinculos = (nAval.get(n.id) ?? 0) + (nFav.get(n.id) ?? 0) + (nProd.get(n.id) ?? 0)
                    const outros = g.itens.filter((o) => o.id !== n.id)
                    return (
                      <li key={n.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-start">
                        <div className="min-w-0 flex-1 text-sm">
                          <span className="flex flex-wrap items-center gap-2">
                            <Link href={`/negocio/${n.slug ?? n.id}`} className="font-semibold text-mata-700 underline">
                              {n.nome}
                            </Link>
                            {i === 0 && <span className="rounded-full bg-mata-100 px-2 py-0.5 text-xs font-semibold text-mata-900">mais antigo</span>}
                            {n.status_cadastro === 'pendente' && <span className="rounded-full bg-casca-100 px-2 py-0.5 text-xs font-semibold text-casca-900">em revisão</span>}
                          </span>
                          <span className="block text-barro-600">
                            {n.reivindicado_por ? `Dono: ${nomeDono.get(n.reivindicado_por) ?? 'conta sem nome'}` : 'Sem dono'} · criado em {dataCurta(n.criado_em)} ·{' '}
                            {ROTULO_ORIGEM[n.origem ?? ''] ?? n.origem ?? 'origem não informada'}
                            {n.bairro ? ` · ${n.bairro}` : ''}
                          </span>
                          <span className="block text-xs text-barro-500">
                            {nAval.get(n.id) ?? 0} avaliações · {nFav.get(n.id) ?? 0} favoritos · {nProd.get(n.id) ?? 0} produtos
                            {n.whatsapp ? ` · WhatsApp ${n.whatsapp}` : ''}
                          </span>
                        </div>
                        <details className="md:w-72">
                          <summary className={cn('cursor-pointer text-sm font-semibold', vinculos ? 'text-casca-800' : 'text-red-700')}>
                            Tirar este do app
                          </summary>
                          <div className="mt-2 flex flex-col gap-2 rounded-xl bg-feira p-3">
                            {[
                              [apagarRepetido, 'Apagar (só se estiver vazio)'],
                              [ocultarRepetido, 'Ocultar (guarda tudo)'],
                            ].map(([acao, rotulo]) => (
                              <FormularioAcao key={rotulo as string} acao={acao as typeof apagarRepetido} rotuloBotao={rotulo as string} className="flex flex-col gap-1.5">
                                <input type="hidden" name="negocio_id" value={n.id} />
                                <label className="flex flex-col gap-1 text-xs font-semibold text-barro-800">
                                  Fica no app
                                  <select name="manter_id" defaultValue={outros[0]?.id} className="h-10 rounded-lg border border-barro-200 bg-superficie px-2 text-sm">
                                    {outros.map((o) => (
                                      <option key={o.id} value={o.id}>
                                        {o.nome} ({dataCurta(o.criado_em)}
                                        {o.reivindicado_por ? `, ${nomeDono.get(o.reivindicado_por) ?? 'com dono'}` : ', sem dono'})
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="flex items-center gap-2 text-xs text-barro-800">
                                  <input type="checkbox" name="confirmar" value="sim" required /> Confirmo que é repetido
                                </label>
                              </FormularioAcao>
                            ))}
                          </div>
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </section>
        ) : null
      )}
    </div>
  )
}
