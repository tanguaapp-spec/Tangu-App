import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { responderComoSuporte } from '@/lib/actions/suporte-actions'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { ConversaChamado, type MensagemChamado } from '@/components/ajuda/conversa-chamado'
import { Selo } from '@/components/ui/selo'
import { ARTIGOS } from '@/lib/ajuda/artigos'
import { CATEGORIAS_CHAMADO, STATUS_CHAMADO, type CategoriaChamado } from '@/lib/ajuda/chamados'

export const dynamic = 'force-dynamic'

export default async function PaginaAdminChamado({ params }: { params: { id: string } }) {
  const db = createServiceClient()
  const { data: chamado } = await db
    .from('chamados_suporte')
    .select('id, perfil_id, negocio_id, categoria, assunto, status, contexto, criado_em, negocio:negocios(nome)')
    .eq('id', params.id)
    .maybeSingle()
  if (!chamado) notFound()

  const [{ data: mensagens }, { data: perfil }, { data: assinatura }] = await Promise.all([
    db.from('mensagens_chamado').select('id, corpo, do_suporte, criado_em').eq('chamado_id', chamado.id).order('criado_em'),
    db.from('perfis').select('nome_completo, criado_em').eq('id', chamado.perfil_id).maybeSingle(),
    chamado.negocio_id
      ? db.from('assinaturas').select('plano_id, status').eq('negocio_id', chamado.negocio_id).neq('status', 'expirada').maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const responder = responderComoSuporte.bind(null, chamado.id)
  const contexto = (chamado.contexto ?? {}) as { pagina?: string; navegador?: string }
  const negocio = chamado.negocio as unknown as { nome: string } | null

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/painel/admin/suporte" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 hover:text-casca-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Chamados
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-barro-900">{chamado.assunto}</h1>
          <p className="text-sm text-barro-500">{CATEGORIAS_CHAMADO[chamado.categoria as CategoriaChamado]}</p>
        </div>
        <Selo tom={STATUS_CHAMADO[chamado.status]?.tom ?? 'neutro'}>{STATUS_CHAMADO[chamado.status]?.rotulo ?? chamado.status}</Selo>
      </div>

      <dl className="mt-4 grid gap-2 rounded-xl border border-barro-100 bg-white p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-barro-500">Pessoa</dt>
          <dd className="text-barro-900">
            {perfil?.nome_completo ?? 'conta excluída'}
            {perfil && <span className="text-barro-400"> · conta desde {new Date(perfil.criado_em).toLocaleDateString('pt-BR')}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-barro-500">Negócio</dt>
          <dd className="text-barro-900">
            {negocio ? (
              <Link href={`/negocio/${chamado.negocio_id}`} className="underline">
                {negocio.nome}
              </Link>
            ) : (
              '—'
            )}
            {assinatura && (
              <span className="text-barro-400">
                {' '}
                · plano {assinatura.plano_id} ({assinatura.status})
              </span>
            )}
          </dd>
        </div>
        {contexto.pagina && (
          <div>
            <dt className="text-barro-500">Página de origem</dt>
            <dd className="font-mono text-xs text-barro-700">{contexto.pagina}</dd>
          </div>
        )}
        {contexto.navegador && (
          <div>
            <dt className="text-barro-500">Navegador</dt>
            <dd className="truncate text-xs text-barro-700" title={contexto.navegador}>
              {contexto.navegador}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 rounded-casca bg-barro-50 p-4">
        <ConversaChamado mensagens={(mensagens ?? []) as MensagemChamado[]} visaoSuporte />
      </div>

      <section className="mt-6 rounded-casca border border-barro-100 bg-white p-5" aria-label="Responder">
        <FormularioAcao acao={responder} rotuloBotao="Enviar">
          <label htmlFor="corpo" className="text-sm font-medium text-barro-800">
            Resposta (a pessoa recebe aviso no app)
          </label>
          <textarea id="corpo" name="corpo" rows={4} maxLength={4000} className="mt-1 w-full rounded-xl border border-barro-300 px-3 py-2 text-sm" />
          <p className="mt-1 text-xs text-barro-500">
            Artigos pra colar o link:{' '}
            {ARTIGOS.slice(0, 6).map((a, i) => (
              <span key={a.slug}>
                {i > 0 && ', '}/ajuda/{a.slug}
              </span>
            ))}
          </p>
          <label htmlFor="status" className="mt-3 block text-sm font-medium text-barro-800">
            Situação depois de salvar
          </label>
          <select id="status" name="status" defaultValue="respondido" className="mt-1 rounded-lg border border-barro-300 px-3 py-1.5 text-sm">
            <option value="respondido">Respondido (aguardando a pessoa)</option>
            <option value="escalado">Em análise (precisa de investigação)</option>
            <option value="resolvido">Resolvido</option>
            <option value="fechado">Fechado</option>
          </select>
        </FormularioAcao>
      </section>
    </div>
  )
}
