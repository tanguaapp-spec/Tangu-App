'use client'

import { useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { validarCodigoCupom } from '@/lib/actions/painel-negocio-actions'

export function ValidarCupom() {
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const form = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={form}
      action={async (formData) => {
        setCarregando(true)
        const r = await validarCodigoCupom(formData)
        setCarregando(false)
        setResultado(r.erro ? { ok: false, texto: r.erro } : { ok: true, texto: r.mensagem ?? 'Válido.' })
        if (!r.erro) form.current?.reset()
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div>
        <label htmlFor="codigo-cupom" className="text-sm font-medium text-barro-800">
          Validar cupom do cliente
        </label>
        <input
          id="codigo-cupom"
          name="codigo"
          required
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={12}
          placeholder="Ex.: K7M2Q9XP"
          className="mt-1 block w-44 rounded-lg border border-barro-300 px-3 py-1.5 font-mono uppercase tracking-widest"
        />
      </div>
      <Botao type="submit" tamanho="sm" variante="secundario" carregando={carregando}>
        Validar
      </Botao>
      {resultado && (
        <p role={resultado.ok ? 'status' : 'alert'} className={`w-full text-sm ${resultado.ok ? 'text-mata-700' : 'text-red-600'}`}>
          {resultado.ok && <CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden="true" />}
          {resultado.texto}
        </p>
      )}
    </form>
  )
}
