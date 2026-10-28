import { TelaCrescimento } from '@/components/painel/crescimento/tela-crescimento'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Crescimento', robots: { index: false } }

export default function PaginaCrescimentoEquipe() {
  return <TelaCrescimento linkLeads="/painel/crescimento/leads" />
}
