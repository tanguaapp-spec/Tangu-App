import { Cabecalho } from '@/components/layout/cabecalho'
import { Rodape } from '@/components/layout/rodape'

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho />
      <main className="flex-1">{children}</main>
      <Rodape />
    </div>
  )
}
