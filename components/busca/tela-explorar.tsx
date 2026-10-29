import Link from 'next/link'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { arvoreCategorias, buscarBairros, buscarCategorias, buscarNegocios, type OrdemBusca } from '@/lib/queries/negocios'
import { LinhaNegocio } from '@/components/vitrine/linha-negocio'
import { CampoBusca } from '@/components/busca/campo-busca'
import { BotoesDivulgar } from '@/components/pwa/convite-divulgar'
import { SeletorFiltro } from '@/components/busca/seletor-filtro'
import { cn } from '@/lib/utils'
import type { ModalidadeAtendimento } from '@/lib/types/database'

export type ParamsExplorar = {
  q?: string
  categoria?: string
  bairro?: string
  modalidade?: string
  tipo?: string
  aberto?: string
  oferta?: string
  verificado?: string
  ordem?: string
  nota?: string
  pagina?: string
}

const CHAVES: (keyof ParamsExplorar)[] = ['q', 'categoria', 'bairro', 'modalidade', 'tipo', 'aberto', 'oferta', 'verificado', 'nota', 'ordem']

// Filtros liga/desliga do protótipo (chips do Explorar)
const ALTERNAVEIS: { chave: keyof ParamsExplorar; valor: string; rotulo: string }[] = [
  { chave: 'aberto', valor: '1', rotulo: 'Aberto agora' },
  { chave: 'oferta', valor: '1', rotulo: 'Com oferta' },
  { chave: 'verificado', valor: '1', rotulo: 'Verificado' },
  { chave: 'modalidade', valor: 'atende_domicilio', rotulo: 'Vai até você' },
  { chave: 'tipo', valor: 'autonomo', rotulo: 'Autônomos' },
]

/**
 * Tela "Explorar" (busca e páginas de categoria). `base` é o caminho da
 * página (/buscar ou /categoria/slug); `fixos` são filtros que vêm do
 * caminho e não aparecem na URL.
 */
export async function TelaExplorar({
  params,
  base = '/buscar',
  titulo = 'Explorar',
  descricao,
  fixos = {},
  topo,
}: {
  /** conteúdo acima da lista (ex.: banner pago da categoria) */
  topo?: React.ReactNode
  params: ParamsExplorar
  base?: string
  titulo?: string
  descricao?: string
  fixos?: Partial<ParamsExplorar>
}) {
  const p = { ...params, ...fixos }
  const pagina = Math.max(1, Number(p.pagina) || 1)
  const modalidade = (['loja_fisica', 'atende_em_casa', 'atende_domicilio', 'servico_digital'] as const).includes(p.modalidade as ModalidadeAtendimento)
    ? (p.modalidade as ModalidadeAtendimento)
    : undefined
  const ordem: OrdemBusca = p.ordem === 'nota' || p.ordem === 'novos' ? p.ordem : 'relevancia'

  const [{ negocios, total, porPagina }, categorias, bairros] = await Promise.all([
    buscarNegocios({
      termo: p.q,
      categoriaSlug: p.categoria,
      bairro: p.bairro,
      modalidade,
      tipo: p.tipo === 'autonomo' ? 'autonomo' : undefined,
      verificado: p.verificado === '1',
      comOferta: p.oferta === '1',
      abertoAgora: p.aberto === '1',
      notaMinima: p.nota === '4' ? 4 : p.nota === '3' ? 3 : undefined,
      ordem,
      pagina,
    }),
    buscarCategorias(),
    buscarBairros(),
  ])

  function url(muda: Partial<Record<keyof ParamsExplorar, string | null>>) {
    const q = new URLSearchParams()
    for (const k of CHAVES) {
      if (k in fixos) continue
      const v = k in muda ? muda[k] : params[k]
      if (v) q.set(k, v)
    }
    if (muda.pagina) q.set('pagina', muda.pagina)
    const s = q.toString()
    return s ? `${base}?${s}` : base
  }

  const filtrosAtivos = CHAVES.filter((k) => k !== 'q' && k !== 'ordem' && !(k in fixos) && params[k]).length
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const resumo =
    total === 0
      ? 'Nenhum resultado'
      : `${total} ${total === 1 ? 'resultado' : 'resultados'}${p.q ? ` para “${p.q}”` : ''}${ordem === 'relevancia' ? ' · destaque pago aparece marcado' : ''}`

  const categoriaAtual = categorias.find((c) => c.slug === p.categoria)
  const arvore = arvoreCategorias(categorias)
  // subcategorias da categoria aberta (ou irmãs, quando a aberta já é uma subcategoria)
  const mae = categoriaAtual ? arvore.find((m) => m.id === (categoriaAtual.parent_id ?? categoriaAtual.id)) : undefined
  const linkCategoria = (slug: string) => ('categoria' in fixos ? `/categoria/${slug}` : url({ categoria: slug }))

  return (
    <div className="md:mx-auto md:max-w-[1200px] md:px-6 md:pt-8">
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-barro-200/80 bg-superficie px-5 pb-3 pt-[max(16px,env(safe-area-inset-top))] md:static md:rounded-[28px] md:border md:p-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-barro-900 md:text-[32px]">{titulo}</h1>
          {descricao && <p className="mt-1 text-sm text-barro-600 md:text-base">{descricao}</p>}
        </div>
        <form action={base} method="get" role="search">
          {CHAVES.filter((k) => k !== 'q' && !(k in fixos) && params[k]).map((k) => (
            <input key={k} type="hidden" name={k} value={params[k]} />
          ))}
          <label className="relative flex h-12 items-center gap-2.5 rounded-[14px] border-[1.5px] border-serra bg-feira px-3.5">
            <Search className="h-[18px] w-[18px] shrink-0 text-mata-700" aria-hidden="true" />
            <CampoBusca
              valorInicial={params.q ?? ''}
              placeholder={categoriaAtual ? `Buscar em ${categoriaAtual.nome}` : 'Nome, serviço ou produto'}
              rotulo="Buscar"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-barro-900 placeholder:font-normal placeholder:text-barro-400 focus:outline-none"
            />
          </label>
        </form>
        <div role="group" aria-label="Filtros" className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
          {ALTERNAVEIS.filter((f) => !(f.chave in fixos)).map((f) => {
            const ligado = p[f.chave] === f.valor
            return (
              <Link
                key={f.rotulo}
                href={url({ [f.chave]: ligado ? null : f.valor })}
                aria-pressed={ligado}
                scroll={false}
                className={cn(
                  'flex h-10 shrink-0 items-center rounded-full px-3.5 text-[13px]',
                  ligado ? 'bg-serra font-bold text-white' : 'border border-barro-200 bg-superficie font-semibold text-barro-900'
                )}
              >
                {f.rotulo}
              </Link>
            )
          })}
          {!('categoria' in fixos) && (
            <SeletorFiltro
              rotulo="Categoria"
              valor={params.categoria ?? ''}
              opcoes={[
                { valor: '', rotulo: 'Todas as categorias' },
                ...arvore.flatMap((m) => [{ valor: m.slug, rotulo: m.nome }, ...m.filhas.map((f) => ({ valor: f.slug, rotulo: `  · ${f.nome}` }))]),
              ]}
              urls={Object.fromEntries([['', url({ categoria: null })], ...categorias.map((c) => [c.slug, url({ categoria: c.slug })])])}
            />
          )}
          {bairros.length > 0 && (
            <SeletorFiltro
              rotulo="Bairro"
              valor={params.bairro ?? ''}
              opcoes={[{ valor: '', rotulo: 'Todos os bairros' }, ...bairros.map((b) => ({ valor: b as string, rotulo: b as string }))]}
              urls={Object.fromEntries([['', url({ bairro: null })], ...bairros.map((b) => [b, url({ bairro: b as string })])])}
            />
          )}
          <SeletorFiltro
            rotulo="Avaliação"
            valor={p.nota === '4' || p.nota === '3' ? p.nota : ''}
            opcoes={[
              { valor: '', rotulo: 'Qualquer nota' },
              { valor: '4', rotulo: '★ 4 ou mais' },
              { valor: '3', rotulo: '★ 3 ou mais' },
            ]}
            urls={{ '': url({ nota: null }), '4': url({ nota: '4' }), '3': url({ nota: '3' }) }}
          />
          <SeletorFiltro
            rotulo="Ordenar"
            valor={ordem === 'relevancia' ? '' : ordem}
            opcoes={[
              { valor: '', rotulo: 'Mais relevantes' },
              { valor: 'nota', rotulo: 'Melhor avaliados' },
              { valor: 'novos', rotulo: 'Chegaram agora' },
            ]}
            urls={{ '': url({ ordem: null }), nota: url({ ordem: 'nota' }), novos: url({ ordem: 'novos' }) }}
          />
        </div>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-6 pt-3.5 md:px-0 md:pt-6">
        {topo}
        {mae && mae.filhas.length > 0 && (
          <nav aria-label={`Tipos de ${mae.nome}`} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0">
            {[{ slug: mae.slug, nome: `Tudo em ${mae.nome}` }, ...mae.filhas].map((c) => {
              const ativo = categoriaAtual?.slug === c.slug
              return (
                <Link
                  key={c.slug}
                  href={linkCategoria(c.slug)}
                  aria-current={ativo ? 'page' : undefined}
                  className={`flex h-11 shrink-0 items-center rounded-full px-4 text-sm ${ativo ? 'bg-serra font-bold text-white' : 'border border-barro-200 bg-superficie font-semibold text-barro-900'}`}
                >
                  {c.nome}
                </Link>
              )
            })}
          </nav>
        )}
        <p className="text-[13px] text-barro-600" aria-live="polite">
          {resumo}
        </p>

        {negocios.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-6 text-center text-sm text-barro-700">
            {filtrosAtivos > 0 ? (
              <>
                Nada com esses filtros.{' '}
                <Link href={url({ aberto: null, oferta: null, verificado: null, modalidade: null, tipo: null, bairro: null, categoria: null })} className="font-bold text-casca-700 underline">
                  Limpar filtros
                </Link>{' '}
                ou{' '}
              </>
            ) : (
              <>Ninguém por aqui ainda. </>
            )}
            <Link href="/orcamentos/novo" className="font-bold text-casca-700 underline">
              peça um orçamento pra cidade
            </Link>
            : quem atende responde pelo app.
            <div className="mt-4 flex flex-col items-center gap-2 border-t border-barro-200/80 pt-4">
              <p className="font-semibold text-barro-900">Conhece alguém que faz isso e ainda não está no app? Indique!</p>
              <BotoesDivulgar compacto />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {negocios.map((n) => (
              <LinhaNegocio key={n.id} negocio={n} oferta={n.oferta} />
            ))}
          </div>
        )}

        {totalPaginas > 1 && (
          <nav className="mt-4 flex items-center justify-center gap-2" aria-label="Paginação">
            <Link
              href={url({ pagina: String(pagina - 1) })}
              aria-disabled={pagina <= 1}
              className={cn('flex h-11 items-center gap-1 rounded-[14px] px-3 text-sm font-semibold', pagina <= 1 ? 'pointer-events-none text-barro-300' : 'text-barro-800 hover:bg-barro-100')}
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Link>
            <span className="px-2 font-mono text-sm text-barro-600">
              {pagina}/{totalPaginas}
            </span>
            <Link
              href={url({ pagina: String(pagina + 1) })}
              aria-disabled={pagina >= totalPaginas}
              className={cn('flex h-11 items-center gap-1 rounded-[14px] px-3 text-sm font-semibold', pagina >= totalPaginas ? 'pointer-events-none text-barro-300' : 'text-barro-800 hover:bg-barro-100')}
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        )}
      </div>
    </div>
  )
}
