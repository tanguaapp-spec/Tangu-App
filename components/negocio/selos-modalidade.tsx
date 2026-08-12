import { Store, House, Car, Laptop } from 'lucide-react'
import { MODALIDADES } from '@/lib/modalidades'
import type { ModalidadeAtendimento } from '@/lib/types/database'

const ICONES: Record<ModalidadeAtendimento, typeof Store> = {
  loja_fisica: Store,
  atende_em_casa: House,
  atende_domicilio: Car,
  servico_digital: Laptop,
}

// Componente de servidor (sem interatividade) — usado no card de busca e no perfil público.
export function SelosModalidade({
  modalidades,
  className,
}: {
  modalidades: ModalidadeAtendimento[] | null | undefined
  className?: string
}) {
  if (!modalidades || modalidades.length === 0) return null

  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`}>
      {modalidades.map((valor) => {
        const info = MODALIDADES.find((m) => m.valor === valor)
        if (!info) return null
        const Icone = ICONES[valor]
        return (
          <span
            key={valor}
            className="inline-flex items-center gap-1 rounded-full bg-barro-100 px-2 py-0.5 text-[11px] font-medium text-barro-700"
          >
            <Icone className="h-3 w-3" />
            {info.rotuloCurto}
          </span>
        )
      })}
    </div>
  )
}
