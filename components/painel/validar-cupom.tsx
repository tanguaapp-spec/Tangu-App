'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { validarCodigoCupom } from '@/lib/actions/painel-negocio-actions'
import { vibrar } from '@/lib/ui/vibrar'

export function ValidarCupom() {
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const form = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={form}
      action={async (formData) => {
        setCarregando(true)
        const r = await chamarAcao(validarCodigoCupom(formData))
        setCarregando(false)
        setResultado(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: r.mensagem ?? 'Válido.' })
        vibrar(r.erro ? [30, 60, 30] : 20)
        if (!r.erro) form.current?.reset()
      }}
      className="flex flex-col gap-2.5"
    >
      <div className="flex gap-2">
        <label htmlFor="codigo-cupom" className="sr-only">
          Código do cupom
        </label>
        <input
          id="codigo-cupom"
          name="codigo"
          required
          autoComplete="off"
          autoCapitalize="characters"
          enterKeyHint="done"
          maxLength={12}
          placeholder="K7M2Q9XP"
          className="h-14 min-w-0 flex-1 rounded-[14px] border-[1.5px] border-barro-200 bg-feira px-4 font-mono text-xl font-bold uppercase tracking-[0.12em] text-barro-900 placeholder:text-barro-300 focus:border-serra focus:outline-none"
        />
        <button disabled={carregando} className="flex h-14 items-center gap-2 rounded-[14px] bg-serra px-5 font-bold text-white disabled:opacity-60">
          {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Validar
        </button>
      </div>
      {resultado && (
        <p
          role={resultado.ok ? 'status' : 'alert'}
          className={`flex items-start gap-2 rounded-[14px] p-3 text-sm font-semibold ${resultado.ok ? 'bg-mata-100 text-mata-700' : 'bg-red-50 text-red-700'}`}
        >
          {resultado.ok ? <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" /> : <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />}
          {resultado.texto}
        </p>
      )}
    </form>
  )
}
