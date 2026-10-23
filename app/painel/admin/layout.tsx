import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { sair } from '@/lib/actions/auth-actions'
import { NavPainel } from '@/components/painel/nav-painel'
import { createServiceClient } from '@/lib/supabase/server'

/** Erros abertos (últimos 30 dias) pro contador do menu. Antes da 0021, conta os da última semana. */
async function errosAbertos() {
  const db = createServiceClient()
  const desde = (dias: number) => new Date(Date.now() - dias * 86400e3).toISOString()
  const comColuna = await db.from('error_logs').select('id', { count: 'exact', head: true }).is('resolvido_em', null).gte('criado_em', desde(30))
  if (!comColuna.error) return comColuna.count ?? 0
  const { count } = await db.from('error_logs').select('id', { count: 'exact', head: true }).gte('criado_em', desde(7))
  return count ?? 0
}

export const dynamic = 'force-dynamic'

// Guarda de servidor pra TODA a área /painel/admin — páginas novas ficam
// protegidas mesmo se esquecerem de chamar requireAdminOrRedirect().
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()
  const erros = await errosAbertos().catch(() => 0)
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <NavPainel papel="admin" acaoSair={sair} errosAbertos={erros} />
      <main className="flex-1 p-5 sm:p-10">{children}</main>
    </div>
  )
}
