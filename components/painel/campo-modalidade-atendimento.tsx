'use client'

import { Store, House, Car, Laptop } from 'lucide-react'
import { MODALIDADES } from '@/lib/modalidades'
import type { ModalidadeAtendimento } from '@/lib/types/database'

const ICONES: Record<ModalidadeAtendimento, typeof Store> = {
  loja_fisica: Store,
  atende_em_casa: House,
  atende_domicilio: Car,
  servico_digital: Laptop,
}

interface Props {
  selecionadas: ModalidadeAtendimento[]
  onChange: (selecionadas: ModalidadeAtendimento[]) => void
}

export function CampoModalidadeAtendimento({ selecionadas, onChange }: Props) {
  function alternar(valor: ModalidadeAtendimento) {
    onChange(
      selecionadas.includes(valor)
        ? selecionadas.filter((v) => v !== valor)
        : [...selecionadas, valor]
    )
  }

  return (
    <div>
      <span className="text-sm font-medium text-barro-800">Como você atende?</span>
      <p className="mt-0.5 text-xs text-barro-500">Pode marcar mais de uma opção.</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {MODALIDADES.map((m) => {
          const Icone = ICONES[m.valor]
          const marcado = selecionadas.includes(m.valor)
          return (
            <label
              key={m.valor}
              className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                marcado ? 'border-mata-500 bg-mata-50' : 'border-barro-200'
              }`}
            >
              <input
                type="checkbox"
                name="modalidades_atendimento"
                value={m.valor}
                checked={marcado}
                onChange={() => alternar(m.valor)}
                className="sr-only"
              />
              <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${marcado ? 'text-mata-600' : 'text-barro-400'}`} />
              <span>
                <span className={`block font-medium ${marcado ? 'text-mata-700' : 'text-barro-800'}`}>{m.rotulo}</span>
                <span className="block text-xs text-barro-500">{m.descricao}</span>
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
