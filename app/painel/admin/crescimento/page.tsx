import { TelaCrescimento } from '@/components/painel/crescimento/tela-crescimento'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Crescimento', robots: { index: false } }

export default function PaginaCrescimento() {
  return <TelaCrescimento linkLeads="/painel/admin/leads" />
}
