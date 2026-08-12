'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { encerrarVaga } from '@/lib/actions/admin-actions'
import { encerrarVagaPropria } from '@/lib/actions/painel-negocio-actions'

export function BotaoEncerrarVaga({
  vagaId,
  origem = 'admin',
}: {
  vagaId: string
  /** de onde a vaga está sendo encerrada — decide qual Server Action chamar.
   *  Propositalmente uma string (não a função em si): passar a Server Action
   *  como prop entre Server e Client Component já causou erro de serialização
   *  em produção; string é sempre serializável. */
  origem?: 'admin' | 'propria'
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

    const acao = origem === 'propria' ? encerrarVagaPropria : encerrarVaga
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
