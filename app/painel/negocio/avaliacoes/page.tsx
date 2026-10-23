import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { ListaAvaliacoes } from '@/components/painel/lista-avaliacoes'
import { TituloPainel } from '@/components/painel/titulo-painel'
import { formatarNota } from '@/lib/ui/apresentacao'

export const metadata: Metadata = { title: 'Avaliações', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaAvaliacoesPainel() {
  const { negocio } = await exigirNegocio('/painel/negocio/avaliacoes')
  const { data: avaliacoes } = await createClient()
    .from('avaliacoes')
    .select('*, autor:perfis(nome_completo, avatar_url)')
    .eq('negocio_id', negocio.id)
    .order('criado_em', { ascending: false })
  const lista = avaliacoes ?? []
  const media = lista.length ? lista.reduce((s, a) => s + a.nota, 0) / lista.length : null
  const semResposta = lista.filter((a) => !a.resposta_profissional).length
  return (
    <>
      <TituloPainel
        titulo="Avaliações"
        descricao="Responder mostra cuidado: a resposta aparece embaixo da avaliação, no seu perfil."
        voltar="/painel/negocio/mais"
        acao={
          media !== null ? (
            <span className="rounded-full bg-casca-100 px-3 py-1.5 font-mono text-sm font-bold text-casca-800">
              ★ {formatarNota(media)} · {lista.length}
            </span>
          ) : null
        }
      />
      {semResposta > 0 && (
        <p className="mb-4 rounded-[14px] bg-mata-100 p-3 text-sm font-semibold text-mata-700">
          {semResposta} {semResposta === 1 ? 'avaliação espera' : 'avaliações esperam'} sua resposta.
        </p>
      )}
      <ListaAvaliacoes avaliacoes={lista as never} />
    </>
  )
}
