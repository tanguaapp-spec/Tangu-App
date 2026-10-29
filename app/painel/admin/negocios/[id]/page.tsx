import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { salvarNegocioAdmin } from '@/lib/actions/admin-gestao-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { OpcoesCategoria } from '@/components/ui/opcoes-categoria'
import { ROTULO_DIA, DIAS_EXIBICAO } from '@/lib/horario/funcionamento'
import type { Categoria } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Editar negócio', robots: { index: false } }
export const dynamic = 'force-dynamic'

const campo = 'h-11 w-full rounded-xl border border-barro-200 bg-superficie px-3 text-sm'

export default async function EditarNegocioAdmin({ params }: { params: { id: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound()
  const db = createServiceClient()
  const [{ data: n }, { data: categorias }] = await Promise.all([
    db.from('negocios').select('*').eq('id', params.id).maybeSingle(),
    db.from('categorias').select('*').order('ordem'),
  ])
  if (!n) notFound()
  const horario = (n.horario_funcionamento ?? {}) as Record<string, string>

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href="/painel/admin/negocios" className="text-sm font-semibold text-barro-600 underline">
        ← Negócios
      </Link>
      <header>
        <h1 className="font-display text-3xl font-semibold text-barro-900">{n.nome}</h1>
        <p className="text-barro-600">
          {n.reivindicado_por ? 'Tem dono: o que você mudar aqui ele também vê no painel.' : 'Ainda sem dono (perfil criado pela plataforma).'}{' '}
          <Link href={`/negocio/${n.slug ?? n.id}`} target="_blank" className="font-semibold text-mata-700 underline">
            Ver perfil
          </Link>
        </p>
      </header>
      <section className="rounded-casca border border-barro-100 bg-superficie p-5">
        <FormularioAcao acao={salvarNegocioAdmin.bind(null, n.id)} rotuloBotao="Salvar alterações">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-barro-700 sm:col-span-2">
              Nome
              <input name="nome" required defaultValue={n.nome} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700">
              Categoria
              <select name="categoria_id" defaultValue={n.categoria_id ?? ''} className={campo}>
                <option value="">Sem categoria</option>
                <OpcoesCategoria categorias={(categorias ?? []) as Categoria[]} />
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700">
              Bairro
              <input name="bairro" defaultValue={n.bairro ?? ''} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700">
              WhatsApp (DDD + número)
              <input name="whatsapp" inputMode="tel" defaultValue={n.whatsapp ?? ''} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700">
              Telefone fixo
              <input name="telefone" inputMode="tel" defaultValue={n.telefone ?? ''} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700 sm:col-span-2">
              Endereço
              <input name="endereco" defaultValue={n.endereco ?? ''} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm text-barro-700 sm:col-span-2">
              Descrição
              <textarea name="descricao" rows={3} maxLength={2000} defaultValue={n.descricao ?? ''} className="w-full rounded-xl border border-barro-200 bg-superficie p-3 text-sm" />
            </label>
            <fieldset className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:col-span-2 sm:grid-cols-2">
              <legend className="mb-1 text-sm font-semibold text-barro-800">Horário (ex.: 08:00-18:00, “Fechado”, ou vazio se não souber)</legend>
              {DIAS_EXIBICAO.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm text-barro-700">
                  <span className="w-20 shrink-0">{ROTULO_DIA[d]}</span>
                  <input name={`horario_${d}`} defaultValue={horario[d] ?? ''} className={campo} />
                </label>
              ))}
            </fieldset>
            <label className="flex min-h-11 items-center gap-2 text-sm text-barro-800 sm:col-span-2">
              <input type="checkbox" name="ativo" defaultChecked={n.ativo} className="h-5 w-5" /> No ar (desmarque para esconder do app)
            </label>
          </div>
        </FormularioAcao>
      </section>
    </div>
  )
}
