import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { decidirSugestaoEvento, removerServicoUtil, salvarNoticia, salvarServicoUtil } from '@/lib/actions/conteudo-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Conteúdo da cidade', robots: { index: false } }

const campo = 'w-full rounded-lg border border-barro-300 bg-superficie px-3 py-2 text-sm'
const ABAS = [
  ['noticias', 'Notícias'],
  ['eventos', 'Eventos sugeridos'],
  ['servicos', 'Serviços úteis'],
] as const

const CATEGORIAS: [string, string][] = [
  ['farmacia_plantao', 'Farmácia de plantão'],
  ['emergencia', 'Emergência'],
  ['saude', 'Saúde'],
  ['prefeitura', 'Prefeitura e serviços públicos'],
  ['coleta', 'Coleta de lixo'],
  ['transporte', 'Transporte'],
  ['outros', 'Outros'],
]

type Noticia = {
  id: string
  titulo: string
  resumo: string | null
  corpo: string
  fonte_nome: string | null
  fonte_url: string | null
  status: string
  patrocinada: boolean
  destaque: boolean
  slug: string
  contato_sugestao: string | null
  criado_em: string
}

function FormNoticia({ n }: { n?: Noticia }) {
  return (
    <FormularioAcao acao={salvarNoticia} rotuloBotao={n ? 'Salvar' : 'Criar notícia'}>
      {n && <input type="hidden" name="id" value={n.id} />}
      <div className="grid gap-3">
        <label className="text-sm">
          <span className="text-barro-600">Título</span>
          <input name="titulo" required defaultValue={n?.titulo} maxLength={160} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Resumo (aparece na lista)</span>
          <input name="resumo" defaultValue={n?.resumo ?? ''} maxLength={300} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Texto</span>
          <textarea name="corpo" rows={6} defaultValue={n?.corpo} className={campo} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-barro-600">Fonte</span>
            <input name="fonte_nome" defaultValue={n?.fonte_nome ?? ''} placeholder="Prefeitura de Tanguá" className={campo} />
          </label>
          <label className="text-sm">
            <span className="text-barro-600">Link da fonte</span>
            <input name="fonte_url" defaultValue={n?.fonte_url ?? ''} placeholder="https://" className={campo} />
          </label>
          <label className="text-sm">
            <span className="text-barro-600">Imagem</span>
            <input type="file" name="imagem" accept="image/*" className={campo} />
          </label>
          <label className="text-sm">
            <span className="text-barro-600">Situação</span>
            <select name="status" defaultValue={n?.status === 'sugerida' ? 'rascunho' : n?.status ?? 'rascunho'} className={campo}>
              <option value="rascunho">Rascunho (não aparece)</option>
              <option value="publicada">Publicada</option>
              <option value="arquivada">Arquivada</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="destaque" defaultChecked={n?.destaque} className="h-5 w-5" /> Fixar no topo
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" name="patrocinada" defaultChecked={n?.patrocinada} className="h-5 w-5" /> Conteúdo patrocinado (mostra o selo)
          </label>
        </div>
      </div>
    </FormularioAcao>
  )
}

export default async function PaginaConteudo({ searchParams }: { searchParams: { aba?: string } }) {
  const aba = ABAS.some(([a]) => a === searchParams.aba) ? searchParams.aba! : 'noticias'
  const db = createServiceClient()
  const [{ data: noticias }, { data: sugestoes }, { data: servicos }] = await Promise.all([
    db.from('noticias').select('*').order('criado_em', { ascending: false }).limit(80),
    db.from('sugestoes_evento').select('*, autor:perfis(nome_completo)').eq('status', 'aberta').order('data_evento'),
    db.from('servicos_uteis').select('*').eq('ativo', true).order('categoria').order('ordem'),
  ])
  const lista = (noticias ?? []) as Noticia[]
  const revisar = lista.filter((n) => n.status === 'sugerida' || n.status === 'rascunho')
  const publicadas = lista.filter((n) => n.status === 'publicada')

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Notícias, eventos e serviços</h1>
        <p className="mt-1 text-barro-600">
          O que moradores sugerem e o que chega do RSS da Prefeitura fica aqui esperando revisão. As fontes RSS são configuradas em{' '}
          <Link href="/painel/admin/configuracoes" className="font-semibold text-mata-700 underline">
            Configurações
          </Link>
          .
        </p>
      </header>
      <nav aria-label="Seções" className="flex flex-wrap gap-2">
        {ABAS.map(([a, r]) => (
          <Link
            key={a}
            href={`/painel/admin/conteudo?aba=${a}`}
            aria-current={a === aba ? 'page' : undefined}
            className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold', a === aba ? 'border-serra bg-serra text-white' : 'border-barro-200 bg-superficie text-barro-800')}
          >
            {r}
            {a === 'noticias' && revisar.length > 0 && <span className="ml-2 rounded-full bg-laranja px-2 font-mono text-xs text-tinta">{revisar.length}</span>}
            {a === 'eventos' && (sugestoes ?? []).length > 0 && <span className="ml-2 rounded-full bg-laranja px-2 font-mono text-xs text-tinta">{sugestoes!.length}</span>}
          </Link>
        ))}
      </nav>

      {aba === 'noticias' && (
        <>
          <details className="rounded-casca border border-dashed border-barro-300 bg-superficie p-5">
            <summary className="cursor-pointer font-semibold text-barro-900">+ Escrever notícia</summary>
            <div className="mt-4">
              <FormNoticia />
            </div>
          </details>
          <h2 className="font-display text-xl font-semibold text-barro-900">Para revisar ({revisar.length})</h2>
          {revisar.length === 0 && <p className="text-barro-600">Nada esperando revisão.</p>}
          {revisar.map((n) => (
            <details key={n.id} className="rounded-casca border border-barro-100 bg-superficie p-5">
              <summary className="cursor-pointer">
                <span className="mr-2 rounded-full bg-barro-100 px-2 py-0.5 text-xs font-bold text-barro-700">{n.status === 'sugerida' ? 'Sugestão de morador' : n.fonte_nome ?? 'Rascunho'}</span>
                <b className="text-barro-900">{n.titulo}</b>
                {n.contato_sugestao && <span className="block text-xs text-barro-500">Contato de quem sugeriu: {n.contato_sugestao}</span>}
              </summary>
              <div className="mt-4">
                <FormNoticia n={n} />
              </div>
            </details>
          ))}
          <h2 className="font-display text-xl font-semibold text-barro-900">Publicadas ({publicadas.length})</h2>
          {publicadas.map((n) => (
            <details key={n.id} className="rounded-casca border border-barro-100 bg-superficie p-5">
              <summary className="cursor-pointer">
                <b className="text-barro-900">{n.titulo}</b>{' '}
                <Link href={`/noticias/${n.slug}`} target="_blank" className="text-sm text-mata-700 underline">
                  ver
                </Link>
              </summary>
              <div className="mt-4">
                <FormNoticia n={n} />
              </div>
            </details>
          ))}
        </>
      )}

      {aba === 'eventos' && (
        <>
          {(sugestoes ?? []).length === 0 && <p className="text-barro-600">Nenhuma sugestão de evento esperando.</p>}
          {(sugestoes ?? []).map((s) => (
            <article key={s.id} className="flex flex-col gap-2 rounded-casca border border-barro-100 bg-superficie p-5">
              <b className="font-display text-lg text-barro-900">{s.titulo}</b>
              <p className="text-sm text-barro-600">
                {new Date(s.data_evento).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'full', timeStyle: 'short' })} · {s.local_evento}
              </p>
              <p className="whitespace-pre-line text-sm text-barro-800">{s.descricao}</p>
              <p className="text-xs text-barro-500">
                Sugerido por {(s.autor as { nome_completo?: string } | null)?.nome_completo ?? 'morador'}
                {s.contato && ` · contato: ${s.contato}`}
              </p>
              <div className="flex flex-wrap gap-3">
                <FormularioAcao acao={decidirSugestaoEvento} rotuloBotao="Publicar na agenda">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="decisao" value="aprovar" />
                </FormularioAcao>
                <FormularioAcao acao={decidirSugestaoEvento} rotuloBotao="Recusar">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="decisao" value="recusar" />
                </FormularioAcao>
              </div>
            </article>
          ))}
        </>
      )}

      {aba === 'servicos' && (
        <>
          <details className="rounded-casca border border-dashed border-barro-300 bg-superficie p-5" open={(servicos ?? []).length < 6}>
            <summary className="cursor-pointer font-semibold text-barro-900">+ Adicionar serviço ou farmácia de plantão</summary>
            <div className="mt-4">
              <FormServico />
            </div>
          </details>
          {(servicos ?? []).map((s) => (
            <details key={s.id} className="rounded-casca border border-barro-100 bg-superficie p-5">
              <summary className="cursor-pointer">
                <span className="mr-2 text-xs font-bold uppercase text-barro-500">{CATEGORIAS.find(([c]) => c === s.categoria)?.[1]}</span>
                <b className="text-barro-900">{s.nome}</b> {s.telefone && <span className="font-mono text-sm text-barro-600">{s.telefone}</span>}
              </summary>
              <div className="mt-4 flex flex-col gap-3">
                <FormServico s={s} />
                <FormularioAcao acao={removerServicoUtil} rotuloBotao="Tirar do app">
                  <input type="hidden" name="id" value={s.id} />
                </FormularioAcao>
              </div>
            </details>
          ))}
        </>
      )}
    </div>
  )
}

function FormServico({ s }: { s?: Record<string, string | number | null> }) {
  const v = (k: string) => (s?.[k] ?? '') as string
  return (
    <FormularioAcao acao={salvarServicoUtil} rotuloBotao={s ? 'Salvar' : 'Adicionar'}>
      {s && <input type="hidden" name="id" value={String(s.id)} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-barro-600">Categoria</span>
          <select name="categoria" defaultValue={v('categoria') || 'farmacia_plantao'} className={campo}>
            {CATEGORIAS.map(([c, r]) => (
              <option key={c} value={c}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Nome</span>
          <input name="nome" required defaultValue={v('nome')} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Telefone</span>
          <input name="telefone" defaultValue={v('telefone')} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">WhatsApp (só números)</span>
          <input name="whatsapp" defaultValue={v('whatsapp')} inputMode="numeric" className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Endereço</span>
          <input name="endereco" defaultValue={v('endereco')} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Horário</span>
          <input name="horario" defaultValue={v('horario')} placeholder="24 horas" className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Plantão de (farmácia)</span>
          <input type="date" name="plantao_inicio" defaultValue={v('plantao_inicio')} className={campo} />
        </label>
        <label className="text-sm">
          <span className="text-barro-600">Plantão até</span>
          <input type="date" name="plantao_fim" defaultValue={v('plantao_fim')} className={campo} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-barro-600">Observação</span>
          <input name="observacao" defaultValue={v('observacao')} maxLength={300} className={campo} />
        </label>
      </div>
    </FormularioAcao>
  )
}
