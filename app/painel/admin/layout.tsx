import { requireAdminOrRedirect } from '@/lib/auth/require-admin'

export const dynamic = 'force-dynamic'

// Guarda de servidor pra TODA a área /painel/admin — páginas novas ficam
// protegidas mesmo se esquecerem de chamar requireAdminOrRedirect().
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  await requireAdminOrRedirect()
  return <>{children}</>
}
