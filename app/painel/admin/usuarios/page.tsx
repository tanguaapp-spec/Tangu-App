import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { reativarUsuario, suspenderUsuario } from '@/lib/actions/admin-gestao-actions'
import { termoSeguro } from '@/lib/queries/negocios'

export const metadata: Metadata = { title: 'Usuários', robots: { index: false } }
export const dynamic = 'force-dynamic'

type Linha = {
  id: string
  nome_completo: string
  papel: string
  bairro: string | null
  origem_cadastro?: string | null
  suspenso_em?: string | null
  motivo_suspensao?: string | null
  criado_em: string
}

export default async function PaginaUsuarios({ searchParams }: { searchParams: { q?: string; suspensos?: string } }) {
  const db = createServiceClient()
  const termo = termoSeguro(searchParams.q ?? '')
  let emails = new Map<string, string>()
  let ids: string[] | null = null

  // busca por e-mail: o e-mail mora no Auth, não em perfis
  if (termo.includes('@')) {
    const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const achados = (data?.users ?? []).filter((u) => u.email?.toLowerCase().includes(termo.toLowerCase()))
    ids = achados.map((u) => u.id)
    emails = new Map(achados.map((u) => [u.id, u.email ?? '']))
  }

  let q = db.from('perfis').select('*').order('criado_em', { ascending: false }).limit(100)
  if (ids) q = q.in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  else if (termo) q = q.ilike('nome_completo', `%${termo}%`)
  if (searchParams.suspensos === '1') q = q.not('suspenso_em', 'is', null)
  const { data } = await q
  const usuarios = (data ?? []) as Linha[]

  if (!termo.includes('@') && usuarios.length) {
    const lote = await Promise.all(usuarios.slice(0, 50).map((u) => db.auth.admin.getUserById(u.id)))
    emails = new Map(lote.map((r, i) => [usuarios[i].id, r.data.user?.email ?? '']))
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-barro-900">Usuários</h1>
      <p className="text-barro-600">Busque por nome ou e-mail. Suspender bloqueia o login na hora e fica registrado na auditoria.</p>
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
              {emails.get(u.id) || '—'}
              {u.bairro ? ` · ${u.bairro}` : ''}
            </p>
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
