'use client'

import { useState } from 'react'
import { Botao } from '@/components/ui/botao'
import { AreaTexto } from '@/components/ui/campo'
import { aprovarNegocioPendente, rejeitarNegocioPendente } from '@/lib/actions/admin-actions'

export function AcoesNegocioPendente({ negocioId }: { negocioId: string }) {
  const [carregando, setCarregando] = useState<'aprovar' | 'rejeitar' | null>(null)
  const [rejeitando, setRejeitando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  async function aprovar() {
    setCarregando('aprovar')
    setErro(null)
    const resultado = await aprovarNegocioPendente(negocioId)
    if (resultado.erro) setErro(resultado.erro)
    else setSucesso('Negócio aprovado e publicado no diretório.')
    setCarregando(null)
  }

  async function rejeitar() {
    setCarregando('rejeitar')
    setErro(null)
    const resultado = await rejeitarNegocioPendente(negocioId, motivo)
    if (resultado.erro) setErro(resultado.erro)
    else setSucesso('Cadastro rejeitado.')
    setCarregando(null)
  }

  if (sucesso) {
    return <p className="text-sm text-mata-700">{sucesso}</p>
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {rejeitando ? (
        <div className="w-full max-w-xs">
          <AreaTexto
            placeholder="Motivo da rejeição (opcional, ajuda o profissional a corrigir e reenviar)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="min-h-[70px] text-sm"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Botao tamanho="sm" variante="fantasma" onClick={() => setRejeitando(false)}>
              Cancelar
            </Botao>
            <Botao tamanho="sm" variante="perigo" carregando={carregando === 'rejeitar'} onClick={rejeitar}>
              Confirmar rejeição
            </Botao>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Botao tamanho="sm" variante="secundario" carregando={carregando === 'aprovar'} onClick={aprovar}>
            Aprovar
          </Botao>
          <Botao tamanho="sm" variante="fantasma" onClick={() => setRejeitando(true)}>
            Rejeitar
          </Botao>
        </div>
      )}

      {erro && (
        <p className="text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}
