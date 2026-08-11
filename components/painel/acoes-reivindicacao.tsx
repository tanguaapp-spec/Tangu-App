'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { aprovarReivindicacao, rejeitarReivindicacao } from '@/lib/actions/admin-actions'

export function AcoesReivindicacao({
  solicitacaoId,
  negocioId,
  solicitanteId,
}: {
  solicitacaoId: string
  negocioId: string
  solicitanteId: string
}) {
  const [carregando, setCarregando] = useState<'aprovar' | 'rejeitar' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function aprovar() {
    setCarregando('aprovar')
    setErro(null)
    setSucesso(null)

    const resultado = await aprovarReivindicacao(solicitacaoId, negocioId, solicitanteId)
    if (resultado.erro) {
      setErro(resultado.erro)
    } else {
      setSucesso('Reivindicação aprovada com sucesso.')
    }

    setCarregando(null)
  }

  async function rejeitar() {
    setCarregando('rejeitar')
    setErro(null)
    setSucesso(null)

    const resultado = await rejeitarReivindicacao(solicitacaoId)
    if (resultado.erro) {
      setErro(resultado.erro)
    } else {
      setSucesso('Reivindicação rejeitada com sucesso.')
    }

    setCarregando(null)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Botao tamanho="sm" variante="secundario" carregando={carregando === 'aprovar'} onClick={aprovar}>
          Aprovar
        </Botao>
        <Botao tamanho="sm" variante="fantasma" carregando={carregando === 'rejeitar'} onClick={rejeitar}>
          Rejeitar
        </Botao>
      </div>

      {erro && (
        <p className="text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}

      {sucesso && <p className="text-sm text-mata-700">{sucesso}</p>}
    </div>
  )
}
