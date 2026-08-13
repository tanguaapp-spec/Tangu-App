import { Zap } from 'lucide-react'
import { Selo } from '@/components/ui/selo'

const CATORZE_DIAS_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Aproximação, não medição real de tempo de resposta (isso exigiria rastrear
 * cada clique-no-whatsapp até a próxima interação do dono, o que não temos
 * ainda): considera "ativo" quem mexeu no perfil nos últimos 14 dias — um
 * sinal indireto, mas honesto, de que o negócio está sendo cuidado.
 */
export function negocioEstaAtivo(atualizadoEm: string) {
  return Date.now() - new Date(atualizadoEm).getTime() < CATORZE_DIAS_MS
}

export function SeloRespondeRapido() {
  return (
    <Selo tom="verde">
      <Zap className="h-3.5 w-3.5" />
      Perfil ativo
    </Selo>
  )
}
