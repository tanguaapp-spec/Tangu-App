import type { Metadata } from 'next'
import { AvaliarAtendimento } from '@/components/ajuda/avaliar-atendimento'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Selo } from '@/components/ui/selo'
import { ConversaChamado, type MensagemChamado } from '@/components/ajuda/conversa-chamado'
import { ResponderChamado } from '@/components/ajuda/responder-chamado'
import { CATEGORIAS_CHAMADO, STATUS_CHAMADO, type CategoriaChamado } from '@/lib/ajuda/chamados'
import { dataHora } from '@/lib/datas'

export const metadata: Metadata = { title: 'Chamado', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaChamado({ params, searchParams }: { params: { id: string }; searchParams: { novo?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/entrar?next=/ajuda/chamados/${params.id}`)

  // RLS: só devolve se o chamado for desta pessoa
  const { data: chamado } = await supabase
    .from('chamados_suporte')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!chamado) notFound()

  const { data: mensagens } = await supabase
    .from('mensagens_chamado')
    .select('id, corpo, do_suporte, criado_em')
    .eq('chamado_id', chamado.id)
    .order('criado_em')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link href="/ajuda/chamados" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 hover:text-casca-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Meus chamados
      </Link>

      {searchParams.novo && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-mata-50 p-3 text-sm text-mata-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Chamado aberto. Você recebe um aviso quando o suporte responder.
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-barro-900">{chamado.assunto}</h1>
          <p className="text-sm text-barro-500">
            {CATEGORIAS_CHAMADO[chamado.categoria as CategoriaChamado]} · aberto em {dataHora(chamado.criado_em)}
          </p>
        </div>
        <Selo tom={STATUS_CHAMADO[chamado.status]?.tom ?? 'neutro'}>{STATUS_CHAMADO[chamado.status]?.rotulo ?? chamado.status}</Selo>
      </div>

      <div className="mt-6 rounded-casca bg-barro-50 p-4">
        <ConversaChamado mensagens={(mensagens ?? []) as MensagemChamado[]} />
      </div>

      {['respondido', 'resolvido', 'fechado'].includes(chamado.status) && (chamado as { avaliacao?: number | null }).avaliacao == null && (mensagens ?? []).some((m) => m.do_suporte) && (
        <div className="mt-6">
          <AvaliarAtendimento chamadoId={chamado.id} />
        </div>
      )}

      <div className="mt-6">
        <ResponderChamado chamadoId={chamado.id} fechado={chamado.status === 'fechado'} />
      </div>
    </div>
  )
}
