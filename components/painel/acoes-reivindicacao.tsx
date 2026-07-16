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

  async function aprovar() {
    setCarregando('aprovar')
    await aprovarReivindicacao(solicitacaoId, negocioId, solicitanteId)
    setCarregando(null)
  }

  async function rejeitar() {
    setCarregando('rejeitar')
    await rejeitarReivindicacao(solicitacaoId)
    setCarregando(null)
  }

  return (
    <div className="flex gap-2">
      <Botao tamanho="sm" variante="secundario" carregando={carregando === 'aprovar'} onClick={aprovar}>
        Aprovar
      </Botao>
      <Botao tamanho="sm" variante="fantasma" carregando={carregando === 'rejeitar'} onClick={rejeitar}>
        Rejeitar
      </Botao>
    </div>
  )
}
