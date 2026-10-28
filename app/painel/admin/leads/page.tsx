import { TelaLeads } from '@/components/painel/crescimento/tela-leads'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Leads', robots: { index: false } }

export default function PaginaLeads({ searchParams }: { searchParams: { lista?: string } }) {
  return <TelaLeads searchParams={searchParams} base="/painel/admin/leads" />
}
