import { requireAdminOrRedirect } from '@/lib/auth/require-admin'
import { sair } from '@/lib/actions/auth-actions'
import { NavPainel } from '@/components/painel/nav-painel'

export const dynamic = 'force-dynamic'

// Guarda de servidor pra TODA a área /painel/admin — páginas novas ficam
// protegidas mesmo se esquecerem de chamar requireAdminOrRedirect().
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()
  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      <NavPainel papel="admin" acaoSair={sair} />
      <main className="flex-1 p-5 sm:p-10">{children}</main>
    </div>
  )
}
