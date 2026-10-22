'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { cancelarAssinatura } from '@/lib/actions/assinatura-actions'

export function BotaoCancelarAssinatura({ validoAte }: { validoAte: string | null }) {
  const [confirmando, setConfirmando] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const router = useRouter()

  async function cancelar() {
    setCarregando(true)
    setErro(null)
    const resultado = await cancelarAssinatura()
    setCarregando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setConfirmando(false)
    router.refresh()
  }

  if (!confirmando) {
    return (
      <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmando(true)}>
        Cancelar assinatura
      </Botao>
    )
  }

  return (
    <div role="alertdialog" aria-labelledby="titulo-cancelar" className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p id="titulo-cancelar" className="font-semibold text-red-800">
        Cancelar a assinatura?
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800">
        <li>Não haverá novas cobranças.</li>
        <li>
          Os recursos pagos continuam até {validoAte ? new Date(validoAte).toLocaleDateString('pt-BR') : 'o fim do período pago'}.
        </li>
        <li>Depois disso o negócio volta pro Gratuito. Nada é apagado — itens acima do limite ficam guardados.</li>
      </ul>
      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {erro}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Botao variante="perigo" tamanho="sm" carregando={carregando} onClick={cancelar}>
          Sim, cancelar
        </Botao>
        <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmando(false)}>
          Manter plano
        </Botao>
      </div>
    </div>
  )
}
