'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, RotateCcw } from 'lucide-react'
import { marcarErrosResolvidos, reabrirErros } from '@/lib/actions/admin-logs-actions'

/** Resolver / reabrir um grupo de erros e copiar o relatório pra mandar a quem vai corrigir. */
export function AcoesErro({ ids, resolvido, relatorio }: { ids: string[]; resolvido: boolean; relatorio: string }) {
  const router = useRouter()
  const [abrindo, setAbrindo] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  const copiar = (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(relatorio)
          setCopiado(true)
          setTimeout(() => setCopiado(false), 2000)
        } catch {
          setErro('Não deu pra copiar. Selecione o texto em "Detalhes técnicos".')
        }
      }}
      className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-barro-200 px-3 text-sm font-semibold text-barro-900"
    >
      {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copiado ? 'Copiado' : 'Copiar detalhes'}
    </button>
  )

  if (resolvido) {
    return (
      <div className="flex flex-wrap gap-2">
        {copiar}
        <button
          type="button"
          disabled={carregando}
          onClick={async () => {
            setCarregando(true)
            const r = await chamarAcao(reabrirErros(ids))
            setCarregando(false)
            if (r.erro) setErro(r.erro)
            else router.refresh()
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-barro-200 px-3 text-sm font-semibold text-barro-900 disabled:opacity-60"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reabrir
        </button>
        {erro && <p role="alert" className="w-full text-sm text-red-700">{erro}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {copiar}
        {!abrindo && (
          <button type="button" onClick={() => setAbrindo(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-serra px-3 text-sm font-bold text-white">
            <Check className="h-4 w-4" aria-hidden="true" /> Marcar como resolvido
          </button>
        )}
      </div>
      {abrindo && (
        <form
          action={async (dados) => {
            setCarregando(true)
            setErro(null)
            const r = await chamarAcao(marcarErrosResolvidos(ids, dados))
            setCarregando(false)
            if (r.erro) setErro(r.erro)
            else router.refresh()
          }}
          className="flex flex-col gap-2 rounded-xl bg-feira p-3"
        >
          <label htmlFor={`nota-${ids[0]}`} className="text-sm font-semibold text-barro-900">
            O que foi feito? (opcional)
          </label>
          <input
            id={`nota-${ids[0]}`}
            name="nota"
            maxLength={500}
            placeholder="Ex.: corrigido no deploy de 23/10; era instabilidade do Mercado Pago"
            className="h-11 rounded-xl border border-barro-200 bg-superficie px-3 text-sm"
          />
          <div className="flex gap-2">
            <button disabled={carregando} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-serra px-4 text-sm font-bold text-white disabled:opacity-60">
              {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Confirmar
            </button>
            <button type="button" onClick={() => setAbrindo(false)} className="h-10 rounded-xl px-3 text-sm font-semibold text-barro-700">
              Cancelar
            </button>
          </div>
        </form>
      )}
      {erro && <p role="alert" className="text-sm text-red-700">{erro}</p>}
    </div>
  )
}
