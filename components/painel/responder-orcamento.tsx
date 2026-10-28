'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { responderPedidoOrcamento, salvarRespostasProntas } from '@/lib/actions/orcamento-actions'

const campo =
  'w-full rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-3.5 text-[15px] text-barro-900 placeholder:text-barro-400 focus:border-serra focus:outline-none'

/** Responder um pedido, com respostas prontas de um toque. */
export function ResponderOrcamento({ pedidoId, prontas, podeEditarProntas }: { pedidoId: string; prontas: string[]; podeEditarProntas: boolean }) {
  const router = useRouter()
  const texto = useRef<HTMLTextAreaElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  return (
    <form
      action={async (dados) => {
        setEnviando(true)
        setErro(null)
        const r = await chamarAcao(responderPedidoOrcamento(pedidoId, dados))
        setEnviando(false)
        if (r.erro) setErro(r.erro)
        else {
          setOk(true)
          if (texto.current) texto.current.value = ''
          router.refresh()
        }
      }}
      className="flex flex-col gap-3"
    >
      {prontas.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-barro-900">Respostas prontas</span>
          <div className="flex flex-wrap gap-2">
            {prontas.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (texto.current) {
                    texto.current.value = p
                    texto.current.focus()
                  }
                }}
                className="max-w-full truncate rounded-full border border-barro-200 bg-feira px-3 py-2 text-left text-sm text-barro-900"
              >
                {p.length > 48 ? `${p.slice(0, 48)}…` : p}
              </button>
            ))}
          </div>
        </div>
      )}
      <label htmlFor="mensagem" className="text-sm font-semibold text-barro-900">
        Sua resposta
      </label>
      <textarea id="mensagem" ref={texto} name="mensagem" required rows={4} maxLength={2000} className={`${campo} py-2.5`} placeholder="Ex.: Consigo fazer na quinta. Inclui material." />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-sm font-semibold text-barro-900">
          Valor (opcional)
          <input name="valor" inputMode="decimal" placeholder="450,00" className={`${campo} h-12 font-mono`} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold text-barro-900">
          Prazo (opcional)
          <input name="prazo" maxLength={100} placeholder="2 dias" className={`${campo} h-12`} />
        </label>
      </div>
      <p className="text-xs text-barro-600">O morador vê sua resposta e pode te chamar no WhatsApp do seu perfil. O contato dele não é mostrado.</p>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      {ok && (
        <p role="status" className="rounded-[14px] bg-mata-100 p-3 text-sm font-semibold text-mata-700">
          Resposta enviada. O morador recebeu um aviso.
        </p>
      )}
      <button disabled={enviando} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-laranja font-bold text-tinta disabled:opacity-60">
        {enviando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Enviar resposta
      </button>
      {podeEditarProntas && <EditarProntas prontas={prontas} />}
    </form>
  )
}

function EditarProntas({ prontas }: { prontas: string[] }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="self-start text-sm font-semibold text-casca-700 underline underline-offset-4">
        {prontas.length ? 'Editar respostas prontas' : 'Criar respostas prontas'}
      </button>
    )
  }
  return (
    <div className="flex flex-col gap-2 rounded-[16px] bg-feira p-3">
      <p className="text-sm text-barro-700">Até 6 textos que você usa sempre (ex.: “Atendo de seg a sáb, orçamento sem compromisso”).</p>
      {Array.from({ length: 6 }).map((_, i) => (
        <input key={i} form="form-prontas" name="resposta" defaultValue={prontas[i] ?? ''} maxLength={500} aria-label={`Resposta pronta ${i + 1}`} className={`${campo} h-11 text-sm`} />
      ))}
      <button
        type="button"
        disabled={salvando}
        onClick={async (e) => {
          const caixa = (e.currentTarget.parentElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[name="resposta"]')
          const dados = new FormData()
          caixa.forEach((c) => dados.append('resposta', c.value))
          setSalvando(true)
          await salvarRespostasProntas(dados)
          setSalvando(false)
          setAberto(false)
          router.refresh()
        }}
        className="h-11 rounded-[14px] bg-serra font-bold text-white disabled:opacity-60"
      >
        Salvar respostas prontas
      </button>
    </div>
  )
}
