'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { removerProduto } from '@/lib/actions/painel-negocio-actions'
import { formatarPrecoBRL } from '@/lib/utils'
import type { ProdutoServico } from '@/lib/types/database'

function formatarPreco(produto: ProdutoServico) {
  if (produto.preco == null) return null
  return formatarPrecoBRL(produto.preco, produto.preco_a_partir_de)
}

export function ListaProdutos({ produtos, negocioId }: { produtos: ProdutoServico[]; negocioId: string }) {
  const router = useRouter()
  const [removendo, setRemovendo] = useState<string | null>(null)

  async function remover(produtoId: string) {
    const ok = window.confirm('Remover este item do catálogo?')
    if (!ok) return
    setRemovendo(produtoId)
    await removerProduto(produtoId, negocioId)
    setRemovendo(null)
    router.refresh()
  }

  if (produtos.length === 0) {
    return <p className="text-sm text-barro-500">Nenhum item no catálogo ainda.</p>
  }

  return (
    <div className="space-y-2">
      {produtos.map((produto) => (
        <div key={produto.id} className="flex items-start justify-between gap-3 rounded-xl border border-barro-100 bg-white p-3.5">
          <div>
            <p className="font-medium text-barro-900">{produto.nome}</p>
            {produto.descricao && <p className="text-sm text-barro-500">{produto.descricao}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {formatarPreco(produto) && (
              <span className="text-sm font-semibold text-mata-700">{formatarPreco(produto)}</span>
            )}
            <button
              onClick={() => remover(produto.id)}
              disabled={removendo === produto.id}
              aria-label="Remover item"
              className="rounded-lg p-1.5 text-barro-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
