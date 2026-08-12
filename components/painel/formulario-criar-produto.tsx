'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarProduto } from '@/lib/actions/painel-negocio-actions'

export function FormularioCriarProduto({ negocioId }: { negocioId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await criarProduto(negocioId, formData)
    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
    ;(document.getElementById('form-produto') as HTMLFormElement)?.reset()
  }

  return (
    <form id="form-produto" action={handleSubmit} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
      <Campo name="nome" id="nome-produto" rotulo="Item" placeholder="Ex: Corte masculino, Troca de óleo..." required />
      <Campo name="preco" id="preco-produto" rotulo="Preço (R$)" placeholder="Ex: 35,00" inputMode="decimal" />
      <div className="flex items-end pb-2.5">
        <label className="flex items-center gap-1.5 text-sm text-barro-600">
          <input type="checkbox" name="preco_a_partir_de" className="rounded border-barro-300" />
          &quot;a partir de&quot;
        </label>
      </div>
      <div className="sm:col-span-3">
        <AreaTexto name="descricao" id="descricao-produto" rotulo="Detalhes (opcional)" placeholder="O que está incluso, tempo estimado..." className="min-h-[70px]" />
      </div>
      {erro && <p className="text-sm text-red-600 sm:col-span-3">{erro}</p>}
      <Botao type="submit" carregando={carregando} tamanho="sm" className="self-start sm:col-span-3">
        Adicionar ao catálogo
      </Botao>
    </form>
  )
}
