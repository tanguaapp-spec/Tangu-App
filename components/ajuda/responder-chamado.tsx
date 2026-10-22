'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { fecharMeuChamado, responderMeuChamado } from '@/lib/actions/suporte-actions'

export function ResponderChamado({ chamadoId, fechado }: { chamadoId: string; fechado: boolean }) {
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const router = useRouter()

  if (fechado) return <p className="text-sm text-barro-500">Este chamado foi fechado. Precisa de mais alguma coisa? Abra um novo.</p>

  return (
    <div className="space-y-3">
      <form
        ref={form}
        action={async (formData) => {
          setCarregando(true)
          setErro(null)
          const r = await responderMeuChamado(chamadoId, formData)
          setCarregando(false)
          if (r.erro) setErro(r.erro)
          else {
            form.current?.reset()
            router.refresh()
          }
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="corpo" className="text-sm font-medium text-barro-800">
          Responder
        </label>
        <textarea id="corpo" name="corpo" required maxLength={4000} rows={3} className="w-full rounded-xl border border-barro-300 bg-superficie px-4 py-2.5 text-barro-900" />
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        <Botao type="submit" tamanho="sm" carregando={carregando} className="self-start">
          Enviar
        </Botao>
      </form>
      <button
        type="button"
        onClick={async () => {
          if (!window.confirm('Fechar o chamado? Você não poderá responder mais nele.')) return
          await fecharMeuChamado(chamadoId)
          router.refresh()
        }}
        className="text-sm text-barro-500 underline hover:text-barro-800"
      >
        Meu problema foi resolvido — fechar chamado
      </button>
    </div>
  )
}
