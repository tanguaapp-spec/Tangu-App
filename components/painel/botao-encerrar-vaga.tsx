'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { encerrarVaga } from '@/lib/actions/admin-actions'

export function BotaoEncerrarVaga({
  vagaId,
  acao = encerrarVaga,
}: {
  vagaId: string
  acao?: (vagaId: string) => Promise<{ erro?: string | null }>
}) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleClick() {
    const ok = window.confirm('Tem certeza que deseja encerrar esta vaga?')
    if (!ok) return

    setCarregando(true)
    setErro(null)
    setSucesso(null)

    const resultado = await acao(vagaId)
    if (resultado.erro) {
      setErro(resultado.erro)
    } else {
      setSucesso('Vaga encerrada com sucesso.')
    }

    setCarregando(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Botao tamanho="sm" variante="fantasma" carregando={carregando} onClick={handleClick}>
        Encerrar
      </Botao>
      {erro && (
        <p className="text-xs text-red-600" role="alert">
          {erro}
        </p>
      )}
      {sucesso && <p className="text-xs text-mata-700">{sucesso}</p>}
    </div>
  )
}
