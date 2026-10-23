'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { atualizarProduto, criarProduto } from '@/lib/actions/painel-negocio-actions'
import type { ProdutoServico } from '@/lib/types/database'

const campo =
  'h-12 w-full rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-3.5 text-[15px] text-barro-900 placeholder:text-barro-400 focus:border-serra focus:outline-none'

/** Criar ou editar item do catálogo (nome, preço, detalhes e foto). */
export function FormularioProduto({
  negocioId,
  produto,
  aoTerminar,
}: {
  negocioId: string
  produto?: ProdutoServico
  aoTerminar?: () => void
}) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [previa, setPrevia] = useState<string | null>(produto?.imagem_url ?? null)
  const id = produto?.id ?? 'novo'

  return (
    <form
      ref={form}
      action={async (dados) => {
        setEnviando(true)
        setErro(null)
        const r = produto ? await atualizarProduto(produto.id, dados) : await criarProduto(negocioId, dados)
        setEnviando(false)
        if (r.erro) {
          setErro(r.erro)
          return
        }
        if (!produto) {
          form.current?.reset()
          setPrevia(null)
        }
        router.refresh()
        aoTerminar?.()
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex gap-3">
        <label className="relative flex h-[76px] w-[76px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-[1.5px] border-dashed border-barro-200 bg-feira text-barro-600">
          {previa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previa} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-0.5 text-[11px] font-semibold">
              <Camera className="h-5 w-5" aria-hidden="true" /> Foto
            </span>
          )}
          <input
            type="file"
            name="foto"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Foto do item (opcional)"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) setPrevia(URL.createObjectURL(f))
            }}
          />
        </label>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="sr-only" htmlFor={`nome-${id}`}>
            Nome do item
          </label>
          <input id={`nome-${id}`} name="nome" required maxLength={120} defaultValue={produto?.nome} placeholder="Ex: Corte feminino" className={campo} />
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor={`preco-${id}`}>
              Preço em reais
            </label>
            <input
              id={`preco-${id}`}
              name="preco"
              inputMode="decimal"
              defaultValue={produto?.preco != null ? String(produto.preco).replace('.', ',') : ''}
              placeholder="Preço (R$)"
              className={`${campo} font-mono`}
            />
            <label className="flex shrink-0 items-center gap-1.5 text-[13px] text-barro-700">
              <input type="checkbox" name="preco_a_partir_de" defaultChecked={produto?.preco_a_partir_de} className="h-4 w-4 rounded" />a partir de
            </label>
          </div>
        </div>
      </div>
      <label className="sr-only" htmlFor={`descricao-${id}`}>
        Detalhes
      </label>
      <textarea
        id={`descricao-${id}`}
        name="descricao"
        maxLength={500}
        defaultValue={produto?.descricao ?? ''}
        placeholder="Detalhes (opcional): o que está incluso, tempo, tamanhos…"
        className="min-h-[72px] w-full rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-3.5 py-2.5 text-[15px] text-barro-900 placeholder:text-barro-400 focus:border-serra focus:outline-none"
      />
      {produto?.imagem_url && (
        <label className="flex items-center gap-2 text-sm text-barro-700">
          <input type="checkbox" name="remover_foto" className="h-4 w-4 rounded" /> Tirar a foto atual
        </label>
      )}
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <div className="flex gap-2">
        <button disabled={enviando} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-laranja font-bold text-tinta disabled:opacity-60">
          {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {produto ? 'Salvar' : 'Adicionar ao catálogo'}
        </button>
        {aoTerminar && (
          <button type="button" onClick={aoTerminar} className="h-12 rounded-[14px] border-[1.5px] border-barro-200 px-4 font-semibold text-barro-900">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
