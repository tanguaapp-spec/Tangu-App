import type { Metadata } from 'next'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { alterarAcessoCrescimento, reativarUsuario, suspenderUsuario } from '@/lib/actions/admin-gestao-actions'
import { termoSeguro } from '@/lib/queries/negocios'
import { GuiaPagina } from '@/components/painel/admin/guia-pagina'

export const metadata: Metadata = { title: 'Usuários', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Linha = {
  id: string
  nome_completo: string
  papel: string
  bairro: string | null
  telefone?: string | null
  whatsapp?: string | null
  origem_cadastro?: string | null
  suspenso_em?: string | null
  motivo_suspensao?: string | null
  convidado_por?: string | null
  codigo_convite?: string | null
  categorias_interesse?: string[] | null
  onboarding_concluido_em?: string | null
  notificacoes_resumo_diario?: boolean | null
  preferencias_notificacao?: Record<string, boolean> | null
  criado_em: string
}

type DadosAuth = { email: string; confirmadoEm: string | null; ultimoAcesso: string | null }
type NegocioDono = { id: string; nome: string; slug: string; status_cadastro: string; ativo: boolean | null; reivindicado_por: string; plano: string }
type Extra = Awaited<ReturnType<typeof detalhesDasContas>>

const quando = (iso: string | null | undefined, comHora = false) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', ...(comHora ? { timeStyle: 'short' } : {}) }) : '—'

const ROTULO_PREF: Record<string, string> = {
  novidades_favoritos: 'Novidades dos favoritos',
  ofertas_favoritos: 'Ofertas dos favoritos',
  mural: 'Avisos do mural',
  ofertas_interesse: 'Ofertas dos interesses',
}

/** Negócios, plano, interesses e atividade das contas listadas, em poucas consultas. */
async function detalhesDasContas(db: ReturnType<typeof createServiceClient>, usuarios: Linha[]) {
  const ids = usuarios.length ? usuarios.map((u) => u.id) : ['00000000-0000-0000-0000-000000000000']
  const idsCategorias = Array.from(new Set(usuarios.flatMap((u) => u.categorias_interesse ?? [])))
  const idsConvidantes = Array.from(new Set(usuarios.map((u) => u.convidado_por).filter((x): x is string => !!x)))
  const [neg, aval, fav, push, cats, conv, eq] = await Promise.all([
    db.from('negocios').select('id, nome, slug, status_cadastro, ativo, reivindicado_por').in('reivindicado_por', ids),
    db.from('avaliacoes').select('autor_id').in('autor_id', ids),
    db.from('favoritos').select('perfil_id').in('perfil_id', ids),
    db.from('push_subscriptions').select('perfil_id').in('perfil_id', ids),
    db.from('categorias').select('id, nome').in('id', idsCategorias.length ? idsCategorias : ids.slice(0, 1)),
    db.from('perfis').select('id, nome_completo').in('id', idsConvidantes.length ? idsConvidantes : ids.slice(0, 1)),
    db.from('equipe_plataforma').select('perfil_id').in('perfil_id', ids),
  ])
  const contar = (linhas: unknown[] | null, campo: string) => {
    const m = new Map<string, number>()
    for (const l of (linhas ?? []) as Record<string, string>[]) m.set(l[campo], (m.get(l[campo]) ?? 0) + 1)
    return m
  }
  const listaNeg = (neg.data ?? []) as Omit<NegocioDono, 'plano'>[]
  const planos = await Promise.all(listaNeg.map((n) => db.rpc('plano_efetivo', { p_negocio_id: n.id })))
  const negocios = new Map<string, NegocioDono[]>()
  listaNeg.forEach((n, i) => {
    const lista = negocios.get(n.reivindicado_por) ?? []
    lista.push({ ...n, plano: (planos[i].data as string | null) ?? 'gratuito' })
    negocios.set(n.reivindicado_por, lista)
  })
  return {
    negocios,
    avaliacoes: contar(aval.data, 'autor_id'),
    favoritos: contar(fav.data, 'perfil_id'),
    aparelhos: contar(push.data, 'perfil_id'),
    categorias: new Map((cats.data ?? []).map((c) => [c.id as string, c.nome as string])),
    convidantes: new Map((conv.data ?? []).map((c) => [c.id as string, c.nome_completo as string])),
    equipe: new Set((eq.data ?? []).map((e) => e.perfil_id as string)),
  }
}

export default async function PaginaUsuarios({ searchParams }: { searchParams: { q?: string; suspensos?: string } }) {
  const db = createServiceClient()
  // antes da 0026 a tabela não existe: lista vazia
  const { data: membros } = await db.from('equipe_plataforma').select('perfil:perfis!equipe_plataforma_perfil_id_fkey(nome_completo)')
  const equipe = (membros ?? []).map((m) => ({ nome: (m.perfil as unknown as { nome_completo?: string } | null)?.nome_completo ?? 'sem nome' }))
  const termo = termoSeguro(searchParams.q ?? '')
  let contas = new Map<string, DadosAuth>()
  const dadosAuth = (u: { email?: string; email_confirmed_at?: string | null; last_sign_in_at?: string | null } | null | undefined): DadosAuth => ({
    email: u?.email ?? '',
    confirmadoEm: u?.email_confirmed_at ?? null,
    ultimoAcesso: u?.last_sign_in_at ?? null,
  })
  let ids: string[] | null = null

  // busca por e-mail: o e-mail mora no Auth, não em perfis
  if (termo.includes('@')) {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const achados = (data?.users ?? []).filter((u) => u.email?.toLowerCase().includes(termo.toLowerCase()))
    ids = achados.map((u) => u.id)
    contas = new Map(achados.map((u) => [u.id, dadosAuth(u)]))
  }

  let q = db.from('perfis').select('*').order('criado_em', { ascending: false }).limit(100)
  if (ids) q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  else if (termo) q = q.ilike('nome_completo', `%${termo}%`)
  if (searchParams.suspensos === '1') q = q.not('suspenso_em', 'is', null)
  const { data } = await q
  const usuarios = (data ?? []) as Linha[]

  if (!termo.includes('@') && usuarios.length) {
    const lote = await Promise.all(usuarios.slice(0, 50).map((u) => db.auth.admin.getUserById(u.id)))
    contas = new Map(lote.map((r, i) => [usuarios[i].id, dadosAuth(r.data.user)]))
  }
  const extra = await detalhesDasContas(db, usuarios)

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-barro-900">Usuários</h1>
      <p className="text-barro-600">Busque por nome ou e-mail. Suspender bloqueia o login na hora e fica registrado na auditoria.</p>
      <GuiaPagina chave="usuarios" />
      <section className="mt-4 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
        <h2 className="font-semibold text-barro-900">Equipe de crescimento</h2>
        <p className="text-sm text-barro-600">
          Quem cuida das métricas e dos clientes. Entra em <b>/painel/crescimento</b> e vê só Crescimento e Leads (sem pagamentos, usuários ou
          configurações).{' '}
          {equipe.length > 0 ? `Hoje: ${equipe.map((e) => e.nome).join(', ')}.` : 'Ninguém ainda.'}
        </p>
        <FormularioAcao acao={alterarAcessoCrescimento} rotuloBotao="Salvar acesso" className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input name="email" type="email" required placeholder="E-mail da conta da pessoa" aria-label="E-mail" className="h-11 min-w-0 flex-1 rounded-xl border border-barro-200 bg-superficie px-3" />
            <select name="acao" aria-label="Ação" className="h-11 rounded-xl border border-barro-200 bg-superficie px-3">
              <option value="conceder">Dar acesso</option>
              <option value="remover">Tirar acesso</option>
            </select>
          </div>
        </FormularioAcao>
      </section>
      <form method="get" className="mt-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={searchParams.q} placeholder="Nome ou e-mail" aria-label="Nome ou e-mail" className="h-11 min-w-0 flex-1 rounded-xl border border-barro-200 bg-superficie px-3" />
        <label className="flex items-center gap-1.5 text-sm text-barro-800">
          <input type="checkbox" name="suspensos" value="1" defaultChecked={searchParams.suspensos === '1'} /> Só suspensos
        </label>
        <button className="h-11 rounded-xl bg-serra px-4 font-semibold text-white">Buscar</button>
      </form>
      <ul className="mt-5 flex flex-col gap-2.5">
        {usuarios.map((u) => (
          <li key={u.id} className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <b className="text-barro-900">{u.nome_completo}</b>
              <span className="text-xs text-barro-600">
                {u.papel} · desde {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                {u.origem_cadastro ? ` · veio de ${u.origem_cadastro}` : ''}
              </span>
            </div>
            <p className="text-sm text-barro-600">
              {contas.get(u.id)?.email || '—'}
              {u.bairro ? ` · ${u.bairro}` : ''}
            </p>
            <FichaUsuario u={u} conta={contas.get(u.id)} extra={extra} />
            {u.suspenso_em ? (
              <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                <span className="flex-1">
                  Suspenso em {new Date(u.suspenso_em).toLocaleDateString('pt-BR')}: {u.motivo_suspensao}
                </span>
                <FormularioAcao acao={reativarUsuario.bind(null, u.id)} rotuloBotao="Reativar">
                  <span />
                </FormularioAcao>
              </div>
            ) : u.papel !== 'admin' ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-red-700">Suspender conta</summary>
                <FormularioAcao acao={suspenderUsuario.bind(null, u.id)} rotuloBotao="Suspender" className="mt-2">
                  <input
                    name="motivo"
                    required
                    minLength={5}
                    maxLength={300}
                    aria-label="Motivo da suspensão"
                    placeholder="Motivo (ex.: golpe denunciado por 3 moradores)"
                    className="h-11 w-full rounded-xl border border-barro-200 px-3 text-sm"
                  />
                </FormularioAcao>
              </details>
            ) : null}
          </li>
        ))}
        {usuarios.length === 0 && <li className="text-sm text-barro-600">Ninguém encontrado.</li>}
      </ul>
    </div>
  )
}

function FichaUsuario({ u, conta, extra }: { u: Linha; conta?: DadosAuth; extra: Extra }) {
  const negocios = extra.negocios.get(u.id) ?? []
  const interesses = (u.categorias_interesse ?? []).map((id) => extra.categorias.get(id)).filter(Boolean)
  const desligadas = Object.entries(u.preferencias_notificacao ?? {})
    .filter(([, v]) => v === false)
    .map(([k]) => ROTULO_PREF[k] ?? k)
  if (u.notificacoes_resumo_diario === false) desligadas.unshift('Resumo diário')
  const aparelhos = extra.aparelhos.get(u.id) ?? 0
  const linhas: [string, string][] = [
    ['E-mail', conta?.email || '—'],
    ['E-mail confirmado', !conta ? '—' : conta.confirmadoEm ? `sim, em ${quando(conta.confirmadoEm)}` : 'não (ainda não tocou no link do e-mail)'],
    ['Último acesso', conta ? quando(conta.ultimoAcesso, true) : '—'],
    ['Telefone', u.telefone || '—'],
    ['WhatsApp', u.whatsapp || '—'],
    ['Bairro', u.bairro || '—'],
    ['Tipo de conta', `${u.papel}${extra.equipe.has(u.id) ? ' · equipe de crescimento' : ''}`],
    ['Cadastro em', quando(u.criado_em, true)],
    ['Veio de', u.origem_cadastro || '—'],
    ['Convidado por', u.convidado_por ? extra.convidantes.get(u.convidado_por) ?? 'conta apagada' : '—'],
    ['Código de convite', u.codigo_convite || '—'],
    ['Interesses', interesses.length ? interesses.join(', ') : u.onboarding_concluido_em ? 'pulou a escolha' : 'ainda não escolheu'],
    ['Notificações no celular', aparelhos > 0 ? `ativas em ${aparelhos} aparelho(s)` : 'não ativou'],
    ['Avisos desligados', desligadas.join(', ') || 'nenhum'],
    ['Avaliações feitas', String(extra.avaliacoes.get(u.id) ?? 0)],
    ['Favoritos', String(extra.favoritos.get(u.id) ?? 0)],
  ]
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-sm font-semibold text-mata-800">Ver dados{negocios.length ? ` · ${negocios.length} negócio(s)` : ''}</summary>
      <div className="mt-2 flex flex-col gap-3 rounded-xl bg-feira p-3 text-sm">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
          {linhas.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-barro-600">{k}</dt>
              <dd className="break-words text-barro-900">{v}</dd>
            </div>
          ))}
        </dl>
        {negocios.length > 0 && (
          <div>
            <b className="text-barro-900">Negócios</b>
            <ul className="mt-1 flex flex-col gap-1.5">
              {negocios.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/negocio/${n.slug}`} className="font-semibold text-mata-800 underline">
                    {n.nome}
                  </Link>
                  <span className="rounded-full bg-barro-100 px-2 py-0.5 text-xs text-barro-800">plano {n.plano}</span>
                  {n.status_cadastro !== 'aprovado' && <span className="rounded-full bg-casca-100 px-2 py-0.5 text-xs text-casca-900">{n.status_cadastro}</span>}
                  {n.ativo === false && <span className="rounded-full bg-barro-100 px-2 py-0.5 text-xs text-barro-800">pausado</span>}
                  <Link href={`/painel/admin/negocios/${n.id}`} className="text-xs font-semibold text-barro-700 underline">
                    editar
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  )
}
