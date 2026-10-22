'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarPedidoOrcamento } from '@/lib/actions/orcamento-actions'
import type { Categoria } from '@/lib/types/database'

export function FormularioPedido({
  categorias,
  negocioEscolhido,
}: {
  categorias: Categoria[]
  negocioEscolhido?: { id: string; nome: string; categoria_id: string | null } | null
}) {
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const router = useRouter()

  return (
    <form
      className="flex flex-col gap-4"
      action={async (formData) => {
        setCarregando(true)
        setErro(null)
        const r = await criarPedidoOrcamento(formData)
        if (r.erro) {
          setErro(r.erro)
          setCarregando(false)
          return
        }
        router.push(`/orcamentos/${r.pedidoId}?enviado=${r.enviadoPara}`)
      }}
    >
      {negocioEscolhido ? (
        <>
          <input type="hidden" name="negocios" value={negocioEscolhido.id} />
          {negocioEscolhido.categoria_id && <input type="hidden" name="categoria_id" value={negocioEscolhido.categoria_id} />}
          <p className="rounded-xl bg-casca-50 p-3 text-sm text-barro-800">
            Pedido para <span className="font-semibold">{negocioEscolhido.nome}</span>.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="categoria_id" className="text-sm font-medium text-barro-800">
              Que tipo de serviço?
            </label>
            <select
              id="categoria_id"
              name="categoria_id"
              required
              className="w-full rounded-xl border border-barro-300 bg-superficie px-4 py-2.5 text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
            >
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2 text-sm text-barro-800">
            <input type="checkbox" name="enviar_categoria" required className="mt-0.5 h-4 w-4" />
            <span>
              Autorizo enviar este pedido para até 8 negócios dessa categoria. Eles veem só o texto do pedido, o bairro e seu
              primeiro nome — nunca seu telefone ou e-mail.
            </span>
          </label>
        </>
      )}

      <Campo id="titulo" name="titulo" rotulo="O que você precisa?" placeholder="Ex.: Pintar uma sala" maxLength={120} required />
      <AreaTexto
        id="descricao"
        name="descricao"
        rotulo="Detalhes"
        maxLength={2000}
        required
        placeholder="Tamanho, material, prazo, melhor horário… quanto mais claro, melhor o orçamento."
      />
      <Campo id="bairro" name="bairro" rotulo="Bairro (opcional)" placeholder="Só o bairro, sem endereço" maxLength={100} />

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <Botao type="submit" carregando={carregando} className="self-start">
        Enviar pedido
      </Botao>
    </form>
  )
}
