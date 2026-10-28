'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Package, Pencil, Trash2 } from 'lucide-react'
import { alternarProdutoAtivo, removerProduto } from '@/lib/actions/painel-negocio-actions'
import { FormularioProduto } from '@/components/painel/formulario-produto'
import { formatarPrecoBRL } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { ProdutoServico } from '@/lib/types/database'

const botao = 'flex h-10 w-10 items-center justify-center rounded-xl text-barro-600 hover:bg-barro-50 disabled:opacity-50'

export function ListaProdutos({ produtos, negocioId }: { produtos: ProdutoServico[]; negocioId: string }) {
  const router = useRouter()
  const [editando, setEditando] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function executar(id: string, acao: () => Promise<{ erro: string | null }>) {
    setOcupado(id)
    setErro(null)
    const r = await chamarAcao(acao())
    setOcupado(null)
    if (r.erro) setErro(r.erro)
    else router.refresh()
  }

  if (produtos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[20px] border-[1.5px] border-dashed border-barro-200 p-6 text-center text-sm text-barro-700">
        <Package className="h-8 w-8 text-barro-400" aria-hidden="true" />
        Nenhum item ainda. Quem já vê o preço chega mais decidido a fechar.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {erro && (
        <p role="alert" className="rounded-[14px] bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </p>
      )}
      {produtos.map((p) =>
        editando === p.id ? (
          <div key={p.id} className="rounded-[20px] border-[1.5px] border-serra bg-superficie p-3.5">
            <FormularioProduto negocioId={negocioId} produto={p} aoTerminar={() => setEditando(null)} />
          </div>
        ) : (
          <div key={p.id} className={cn('flex items-center gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3', !p.ativo && 'opacity-60')}>
            {p.imagem_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imagem_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-mata-100 text-mata-700">
                <Package className="h-6 w-6" aria-hidden="true" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-barro-900">{p.nome}</span>
              <span className="block text-[13px] text-barro-600">
                {p.preco != null ? <span className="font-mono font-bold text-mata-700">{formatarPrecoBRL(Number(p.preco), p.preco_a_partir_de)}</span> : 'Sem preço'}
                {!p.ativo && ' · arquivado'}
              </span>
            </span>
            <button type="button" className={botao} aria-label={`Editar ${p.nome}`} onClick={() => setEditando(p.id)}>
              <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={botao}
              disabled={ocupado === p.id}
              aria-label={p.ativo ? `Arquivar ${p.nome}` : `Reativar ${p.nome}`}
              title={p.ativo ? 'Arquivar (some do perfil)' : 'Reativar'}
              onClick={() => executar(p.id, () => alternarProdutoAtivo(p.id, !p.ativo))}
            >
              {p.ativo ? <Archive className="h-[18px] w-[18px]" aria-hidden="true" /> : <ArchiveRestore className="h-[18px] w-[18px]" aria-hidden="true" />}
            </button>
            <button
              type="button"
              className={cn(botao, 'hover:bg-red-50 hover:text-red-700')}
              disabled={ocupado === p.id}
              aria-label={`Apagar ${p.nome}`}
              onClick={() => window.confirm(`Apagar "${p.nome}" do catálogo?`) && executar(p.id, () => removerProduto(p.id))}
            >
              <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        )
      )}
    </div>
  )
}
