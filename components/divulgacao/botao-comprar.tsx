'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { comprarDivulgacao } from '@/lib/actions/divulgacao-actions'
import { reais as formatarCentavos } from '@/lib/vendas/whatsapp'
import { rotuloPeriodo, type OpcaoServico } from '@/lib/divulgacao/servicos'
import { cn } from '@/lib/utils'

/** Escolhe o período e vai pro checkout do Mercado Pago (Pix, cartão ou boleto). */
export function BotaoComprar({ servicoId, opcoes }: { servicoId: string; opcoes: OpcaoServico[] }) {
  const [dias, setDias] = useState(opcoes[0]?.dias ?? 0)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const escolhida = opcoes.find((o) => o.dias === dias) ?? opcoes[0]
  if (!escolhida) return null

  return (
    <div className="flex flex-col gap-3">
      {opcoes.length > 1 && (
        <div role="radiogroup" aria-label="Período" className="flex flex-wrap gap-2">
          {opcoes.map((o) => (
            <button
              key={o.dias}
              type="button"
              role="radio"
              aria-checked={o.dias === dias}
              onClick={() => setDias(o.dias)}
              className={cn(
                'flex min-h-11 flex-col items-start rounded-xl border px-3 py-1.5 text-left text-sm',
                o.dias === dias ? 'border-mata-700 bg-mata-50 font-bold text-mata-800' : 'border-barro-200 text-barro-800'
              )}
            >
              {rotuloPeriodo(o.dias)}
              <span className="font-mono text-xs">{formatarCentavos(o.preco_centavos)}</span>
            </button>
          ))}
        </div>
      )}
      <Botao
        carregando={carregando}
        className="w-full"
        onClick={async () => {
          setCarregando(true)
          setErro(null)
          const fd = new FormData()
          fd.set('servico_id', servicoId)
          fd.set('dias', String(escolhida.dias))
          const r = await comprarDivulgacao(fd)
          if (r.erro || !('urlPagamento' in r) || !r.urlPagamento) {
            setErro(r.erro ?? 'Não foi possível abrir o pagamento.')
            setCarregando(false)
            return
          }
          window.location.href = r.urlPagamento
        }}
      >
        {carregando ? 'Abrindo o pagamento…' : `Comprar por ${formatarCentavos(escolhida.preco_centavos)}`}
      </Botao>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
