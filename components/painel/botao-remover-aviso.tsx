'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { removerAviso } from '@/lib/actions/admin-actions'

export function BotaoRemoverAviso({ avisoId }: { avisoId: string }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function handleClick() {
    const ok = window.confirm('Tem certeza que deseja remover este aviso do mural?')
    if (!ok) return

    setCarregando(true)
    setErro(null)
    setSucesso(null)

    const resultado = await removerAviso(avisoId)
    if (resultado.erro) {
      setErro(resultado.erro)
    } else {
      setSucesso('Aviso removido com sucesso.')
    }

    setCarregando(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Botao tamanho="sm" variante="fantasma" carregando={carregando} onClick={handleClick}>
        Remover
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
