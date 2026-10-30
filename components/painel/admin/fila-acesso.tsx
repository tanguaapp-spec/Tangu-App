import { createServiceClient } from '@/lib/supabase/server'
import { telefoneDaConta } from '@/lib/auth/acesso'
import { cancelarPedidoAcesso } from '@/lib/actions/acesso-actions'
import { dataHora } from '@/lib/datas'
import { FormularioAcao } from '@/components/painel/admin/formulario-acao'
import { EnviarAcessoWhatsapp } from '@/components/painel/admin/enviar-acesso-whatsapp'

const mascarar = (tel: string) => {
  const d = tel.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '')
  return d.length >= 10 ? `(${d.slice(0, 2)}) •••••-${d.slice(-4)}` : tel
}

/** Quem pediu o link de nova senha pelo WhatsApp (Esqueci minha senha → Receber pelo WhatsApp). */
export async function FilaAcesso() {
  const db = createServiceClient()
  const { data, error } = await db
    .from('pedidos_acesso')
    .select('id, perfil_id, criado_em, perfil:perfis!pedidos_acesso_perfil_id_fkey(nome_completo)')
    .eq('status', 'pendente')
    .order('criado_em')
    .limit(30)
  // antes da migration 0028 a tabela não existe: não mostra nada
  if (error || !data?.length) return null

  const pedidos = await Promise.all(
    data.map(async (p) => {
      const [conta, telefone] = await Promise.all([db.auth.admin.getUserById(p.perfil_id as string), telefoneDaConta(db, p.perfil_id as string)])
      return {
        id: p.id as string,
        nome: (p.perfil as unknown as { nome_completo?: string } | null)?.nome_completo ?? 'sem nome',
        email: conta.data.user?.email ?? '—',
        criadoEm: p.criado_em as string,
        telefone,
      }
    })
  )

  return (
    <section id="acesso" aria-labelledby="t-acesso" className="mt-6 flex scroll-mt-20 flex-col gap-3 rounded-[20px] border border-casca-200 bg-casca-50 p-4">
      <div>
        <h2 id="t-acesso" className="font-display text-lg font-bold text-casca-900">
          Pedidos de acesso pelo WhatsApp ({pedidos.length})
        </h2>
        <p className="text-sm text-barro-800">
          Pessoas que não conseguem entrar e pediram o link de nova senha. O link vai sempre para o número que já está na conta. Gere na hora de
          enviar: ele vale 1 hora.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {pedidos.map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-xl bg-superficie p-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1 text-sm">
              <b className="text-barro-900">{p.nome}</b>
              <p className="break-all text-barro-700">{p.email}</p>
              <p className="text-xs text-barro-600">
                Pedido em {dataHora(p.criadoEm)} ·{' '}
                {p.telefone ? `WhatsApp ${mascarar(p.telefone.numero)} (do ${p.telefone.origem === 'perfil' ? 'perfil' : 'negócio'})` : 'número removido da conta'}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {p.telefone && <EnviarAcessoWhatsapp pedidoId={p.id} />}
              <FormularioAcao acao={cancelarPedidoAcesso} rotuloBotao="Descartar">
                <input type="hidden" name="pedido_id" value={p.id} />
              </FormularioAcao>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
