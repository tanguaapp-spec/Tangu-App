'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { alternarDestaque } from '@/lib/actions/admin-actions'

export function ToggleDestaque({
  negocioId,
  ativo,
  expiraEm,
}: {
  negocioId: string
  ativo: boolean
  expiraEm: string | null
}) {
  const router = useRouter()
  const [dias, setDias] = useState('30')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function agir(novoAtivo: boolean) {
    setCarregando(true)
    setErro(null)
    const resultado = await alternarDestaque(negocioId, novoAtivo, novoAtivo ? Number(dias) || undefined : undefined)
    setCarregando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  if (ativo) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-casca-100 px-2.5 py-1 text-xs font-semibold text-casca-700">
          <Sparkles className="h-3 w-3" /> Destaque ativo
          {expiraEm && ` até ${new Date(expiraEm).toLocaleDateString('pt-BR')}`}
        </span>
        <Botao tamanho="sm" variante="fantasma" carregando={carregando} onClick={() => agir(false)}>
          Desativar
        </Botao>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min={1}
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          className="w-16 rounded-lg border border-barro-200 px-2 py-1 text-sm"
          aria-label="Dias de destaque"
        />
        <span className="text-xs text-barro-500">dias</span>
        <Botao tamanho="sm" carregando={carregando} onClick={() => agir(true)}>
          Ativar destaque
        </Botao>
      </div>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  )
}
