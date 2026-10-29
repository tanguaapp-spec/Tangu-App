import { createServiceClient } from '@/lib/supabase/server'
import { AcoesReivindicacao } from '@/components/painel/acoes-reivindicacao'
import { ShieldCheck } from 'lucide-react'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { marcarCodigoEnviado } from '@/lib/actions/reivindicacao-codigo-actions'
import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export default async function PainelReivindicacoes() {
  await requireAdminOrRedirect()
  // service role: telefone do dono é coluna privada (0016); acesso já validado como admin
  const supabase = createServiceClient()
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes_reivindicacao')
    .select(
      '*, negocio:negocios(nome, endereco), solicitante:perfis!solicitacoes_reivindicacao_solicitante_id_fkey(nome_completo, telefone)'
    )
    .eq('status', 'pendente')
    .order('criado_em', { ascending: true })
    .limit(50)

  if (error) {
    console.error('Erro ao buscar reivindicações pendentes:', error.message)
  }
  // códigos pedidos pelos donos (0027): mandar com 1 toque no WhatsApp do comércio
  const { data: codigos } = await supabase
    .from('codigos_reivindicacao')
    .select('id, status, telefone, mensagem, criado_em, negocio:negocios(nome), pessoa:perfis!codigos_reivindicacao_perfil_id_fkey(nome_completo)')
    .in('status', ['aguardando_envio', 'enviado'])
    .gt('expira_em', new Date().toISOString())
    .order('criado_em')
    .limit(50)

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">Reivindicações pendentes</h1>
      <p className="text-barro-600">Confirme se quem solicitou é mesmo o responsável pelo negócio.</p>

      <section id="codigos" className="mt-6 flex scroll-mt-20 flex-col gap-3">
        <h2 className="font-display text-xl font-semibold text-barro-900">Códigos para enviar ({(codigos ?? []).filter((c) => c.status === 'aguardando_envio').length})</h2>
        <p className="text-sm text-barro-600">
          O dono pediu para assumir o perfil. Toque em “Enviar no WhatsApp do comércio”: a mensagem com o código já vai pronta para o número que
          está no cadastro. Quando ele digitar o código no app, o perfil passa pra ele na hora, sem precisar aprovar aqui.
        </p>
        {(codigos ?? []).length === 0 && <p className="text-sm text-barro-500">Nenhum código pendente.</p>}
        {(codigos ?? []).map((c) => {
          const tel = String(c.telefone).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
          const link = c.mensagem ? `https://wa.me/55${tel}?text=${encodeURIComponent(c.mensagem)}` : null
          return (
            <article key={c.id} className="flex flex-col gap-2 rounded-casca border border-barro-100 bg-superficie p-4">
              <b className="text-barro-900">{(c.negocio as unknown as { nome?: string } | null)?.nome}</b>
              <p className="text-sm text-barro-600">
                Pedido por {(c.pessoa as unknown as { nome_completo?: string } | null)?.nome_completo ?? 'usuário'} · {new Date(c.criado_em).toLocaleString('pt-BR')} ·{' '}
                {c.status === 'enviado' ? 'código já enviado' : 'aguardando envio'}
              </p>
              <div className="flex flex-wrap gap-2">
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-[#1F8A4C] px-4 text-sm font-bold text-white">
                    Enviar no WhatsApp do comércio
                  </a>
                )}
                {c.status === 'aguardando_envio' && (
                  <FormularioAcao acao={marcarCodigoEnviado} rotuloBotao="Marquei como enviado">
                    <input type="hidden" name="id" value={c.id} />
                  </FormularioAcao>
                )}
                <FormularioAcao acao={marcarCodigoEnviado} rotuloBotao="Cancelar pedido">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="acao" value="cancelar" />
                </FormularioAcao>
              </div>
            </article>
          )
        })}
      </section>

      <h2 className="mt-8 font-display text-xl font-semibold text-barro-900">Pedidos com mensagem</h2>

      {!solicitacoes || solicitacoes.length === 0 ? (
        <div className="mt-10 text-center text-barro-500">
          <ShieldCheck className="mx-auto h-10 w-10 text-barro-300" />
          <p className="mt-2">Nenhuma solicitação pendente. Tudo em dia!</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {solicitacoes.map((s: any) => (
            <div key={s.id} className="rounded-casca border border-barro-100 bg-superficie p-5 shadow-feira">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-barro-900">{s.negocio?.nome}</h3>
                  <p className="text-sm text-barro-500">{s.negocio?.endereco}</p>
                  <p className="mt-2 text-sm text-barro-700">
                    <span className="font-medium">Solicitante:</span> {s.solicitante?.nome_completo} ·{' '}
                    {s.solicitante?.telefone}
                  </p>
                  {s.mensagem && <p className="mt-1 text-sm text-barro-600 italic">&quot;{s.mensagem}&quot;</p>}
                </div>
                <AcoesReivindicacao solicitacaoId={s.id} negocioId={s.negocio_id} solicitanteId={s.solicitante_id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
