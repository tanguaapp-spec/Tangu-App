'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stamp, Gift } from 'lucide-react'
import { adicionarCarimbo, confirmarResgateFidelidade } from '@/lib/actions/painel-negocio-actions'
import type { CartaoFidelidade } from '@/lib/types/database'

interface Cliente {
  perfil: { id: string; nome_completo: string }
  cartao: CartaoFidelidade | null
}

export function CartaoFidelidadeClientes({ negocioId, clientes, meta = 10 }: { negocioId: string; clientes: Cliente[]; meta?: number }) {
  const router = useRouter()
  const [carregandoId, setCarregandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function carimbar(perfilId: string) {
    setCarregandoId(perfilId)
    setErro(null)
    const resultado = await adicionarCarimbo(negocioId, perfilId)
    setCarregandoId(null)
    if (resultado.erro) return setErro(resultado.erro)
    router.refresh()
  }

  async function resgatar(perfilId: string) {
    setCarregandoId(perfilId)
    setErro(null)
    const resultado = await confirmarResgateFidelidade(negocioId, perfilId)
    setCarregandoId(null)
    if (resultado.erro) return setErro(resultado.erro)
    router.refresh()
  }

  if (clientes.length === 0) {
    return (
      <p className="text-sm text-barro-500">
        Assim que alguém favoritar ou avaliar seu perfil, você pode começar a carimbar o cartão fidelidade dessa pessoa.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {clientes.map(({ perfil, cartao }) => {
        const carimbos = cartao?.carimbos ?? 0
        const completo = carimbos >= meta
        return (
          <div
            key={perfil.id}
            data-testid="cliente-fidelidade"
            className="flex items-center justify-between gap-3 rounded-xl border border-barro-100 bg-white px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-barro-800">{perfil.nome_completo}</p>
              <p className="text-xs text-barro-500">{carimbos}/{meta} carimbos{cartao && cartao.completos > 0 ? ` · ${cartao.completos} resgate(s)` : ''}</p>
            </div>
            {completo ? (
              <button
                onClick={() => resgatar(perfil.id)}
                disabled={carregandoId === perfil.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-casca-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-casca-800 disabled:opacity-60"
              >
                <Gift className="h-3.5 w-3.5" /> Confirmar resgate
              </button>
            ) : (
              <button
                onClick={() => carimbar(perfil.id)}
                disabled={carregandoId === perfil.id}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-mata-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-mata-600 disabled:opacity-60"
              >
                <Stamp className="h-3.5 w-3.5" /> +1 carimbo
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
