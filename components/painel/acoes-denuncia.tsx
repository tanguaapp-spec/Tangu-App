'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { revisarDenuncia } from '@/lib/actions/moderacao-actions'

export function AcoesDenuncia({ denunciaId }: { denunciaId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState<'remover' | 'arquivar' | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function agir(acao: 'remover' | 'arquivar') {
    setCarregando(acao)
    setErro(null)
    const resultado = await revisarDenuncia(denunciaId, acao)
    setCarregando(null)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Botao tamanho="sm" variante="perigo" carregando={carregando === 'remover'} onClick={() => agir('remover')}>
          Remover conteúdo
        </Botao>
        <Botao tamanho="sm" variante="fantasma" carregando={carregando === 'arquivar'} onClick={() => agir('arquivar')}>
          Arquivar (sem procedência)
        </Botao>
      </div>
      {erro && (
        <p className="text-sm text-red-600" role="alert">
          {erro}
        </p>
      )}
    </div>
  )
}
