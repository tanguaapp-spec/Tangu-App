import { Cabecalho } from '@/components/layout/cabecalho'
import { Rodape } from '@/components/layout/rodape'
import { NavInferior } from '@/components/layout/nav-inferior'
import { ProvedorSessao } from '@/components/layout/sessao'
import { PullToRefresh } from '@/components/pwa/pull-to-refresh'
import { PromptInstalacao } from '@/components/pwa/prompt-instalacao'

export default function LayoutPublico({ children }: { children: React.ReactNode }) {
  return (
    <ProvedorSessao>
      <div className="flex min-h-screen flex-col">
        <Cabecalho />
        <PullToRefresh>
          {/* pb: a barra inferior fixa não tapa o fim do conteúdo no celular */}
          <main className="flex-1 pb-[calc(var(--altura-nav)+16px)] md:pb-0">{children}</main>
          <Rodape />
        </PullToRefresh>
        <NavInferior />
        <PromptInstalacao />
      </div>
    </ProvedorSessao>
  )
}
