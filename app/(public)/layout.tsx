import { Cabecalho } from '@/components/layout/cabecalho'
import { Rodape } from '@/components/layout/rodape'
import { NavInferior } from '@/components/layout/nav-inferior'
import { PullToRefresh } from '@/components/pwa/pull-to-refresh'
import { PromptInstalacao } from '@/components/pwa/prompt-instalacao'

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Cabecalho />
      <PullToRefresh>
        {/* pb: espaço pra barra inferior fixa não tapar o fim do conteúdo no mobile */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        <Rodape />
      </PullToRefresh>
      <NavInferior />
      <PromptInstalacao />
    </div>
  )
}
