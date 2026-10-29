'use client'

import { useMemo, useState } from 'react'
import { Minus, Plus, ShoppingBag } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { registrarCliqueWhatsapp } from '@/lib/actions/negocio-actions'
import { linkWhatsapp } from '@/lib/utils'
import { mensagemPedido, reais, totalPedido, type ConfigPedidos } from '@/lib/vendas/whatsapp'
import { cn } from '@/lib/utils'

type Produto = { id: string; nome: string; precoCentavos: number | null }

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base text-barro-900'

/** Monta o pedido pelo catálogo e abre o WhatsApp do negócio com tudo escrito. */
export function PedidoWhatsapp({ negocioId, negocio, whatsapp, produtos, config }: { negocioId: string; negocio: string; whatsapp: string; produtos: Produto[]; config: ConfigPedidos }) {
  const [aberto, setAberto] = useState(false)
  const [qtd, setQtd] = useState<Record<string, number>>({})
  const podeEntregar = config.entrega !== false
  const podeRetirar = config.retirada !== false
  const [entrega, setEntrega] = useState(podeEntregar && !podeRetirar)
  const [nome, setNome] = useState('')
  const [endereco, setEndereco] = useState('')
  const [pagamento, setPagamento] = useState('')
  const [obs, setObs] = useState('')

  const itens = useMemo(
    () => produtos.filter((p) => (qtd[p.id] ?? 0) > 0).map((p) => ({ nome: p.nome, quantidade: qtd[p.id], precoCentavos: p.precoCentavos })),
    [produtos, qtd]
  )
  const conta = totalPedido(itens, entrega, config)
  const minimo = config.pedido_minimo_centavos ?? 0
  const abaixoMinimo = minimo > 0 && conta.subtotal < minimo
  const falta = !itens.length ? 'Escolha ao menos um item.' : nome.trim().length < 2 ? 'Diga seu nome.' : entrega && endereco.trim().length < 5 ? 'Informe o endereço de entrega.' : abaixoMinimo ? `Pedido mínimo: ${reais(minimo)}.` : null
  const mensagem = mensagemPedido({ negocio, itens, entrega, config, nome: nome.trim(), endereco: endereco.trim(), pagamento, observacao: obs.trim() })
  const mudar = (id: string, d: number) => setQtd((q) => ({ ...q, [id]: Math.max(0, Math.min(99, (q[id] ?? 0) + d)) }))
  const totalItens = itens.reduce((s, i) => s + i.quantidade, 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-laranja px-5 font-bold text-tinta shadow-feira"
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" /> Fazer pedido pelo WhatsApp
      </button>
      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Seu pedido">
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col divide-y divide-barro-100">
            {produtos.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <b className="block text-barro-900">{p.nome}</b>
                  <span className="font-mono text-sm text-barro-600">{p.precoCentavos !== null ? reais(p.precoCentavos) : 'preço a combinar'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={`Tirar um ${p.nome}`} onClick={() => mudar(p.id, -1)} disabled={!qtd[p.id]} className="flex h-11 w-11 items-center justify-center rounded-xl border border-barro-200 disabled:opacity-40">
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <span className="w-7 text-center font-mono font-bold" aria-live="polite">
                    {qtd[p.id] ?? 0}
                  </span>
                  <button type="button" aria-label={`Adicionar um ${p.nome}`} onClick={() => mudar(p.id, 1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-serra text-white">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </span>
              </li>
            ))}
          </ul>

          {podeEntregar && podeRetirar && (
            <div role="radiogroup" aria-label="Como receber" className="grid grid-cols-2 gap-2">
              {[
                [false, 'Vou retirar'],
                [true, 'Quero entrega'],
              ].map(([v, r]) => (
                <button
                  key={String(v)}
                  type="button"
                  role="radio"
                  aria-checked={entrega === v}
                  onClick={() => setEntrega(v as boolean)}
                  className={cn('min-h-11 rounded-xl border font-semibold', entrega === v ? 'border-serra bg-serra text-white' : 'border-barro-200 text-barro-900')}
                >
                  {r as string}
                </button>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
            Seu nome
            <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} autoComplete="name" className={campo} />
          </label>
          {entrega && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Endereço de entrega
              <input value={endereco} onChange={(e) => setEndereco(e.target.value)} maxLength={200} autoComplete="street-address" className={campo} />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
            Vai pagar como? (opcional)
            <select value={pagamento} onChange={(e) => setPagamento(e.target.value)} className={campo}>
              <option value="">Combinar na conversa</option>
              <option>Pix</option>
              <option>Dinheiro</option>
              <option>Cartão na entrega/retirada</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
            Observação (opcional)
            <input value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} placeholder="Ex.: sem cebola" className={campo} />
          </label>
          {config.observacao && <p className="rounded-xl bg-barro-50 p-3 text-sm text-barro-700">{config.observacao}</p>}

          <div className="flex items-center justify-between rounded-xl bg-mata-50 p-3 text-mata-900">
            <span>
              {totalItens} {totalItens === 1 ? 'item' : 'itens'}
              {entrega && conta.taxa > 0 && ` + entrega ${reais(conta.taxa)}`}
            </span>
            <b className="font-mono text-lg">
              {reais(conta.total)}
              {conta.semPreco && ' +'}
            </b>
          </div>
          {falta ? (
            <p className="text-center text-sm font-semibold text-barro-600">{falta}</p>
          ) : (
            <a
              href={linkWhatsapp(whatsapp, mensagem)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => registrarCliqueWhatsapp(negocioId).catch(() => undefined)}
              className="flex min-h-[52px] items-center justify-center rounded-2xl bg-[#1F8A4C] font-bold text-white"
            >
              Enviar pedido no WhatsApp
            </a>
          )}
          <p className="text-center text-xs text-barro-500">O pedido é confirmado pelo próprio negócio na conversa.</p>
        </div>
      </BottomSheet>
    </>
  )
}
