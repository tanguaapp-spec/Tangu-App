'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { sincronizarProspeccoes } from '@/lib/actions/prospeccao-actions'

export function SincronizarProspeccao() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function sincronizar() {
    setCarregando(true)
    setErro(null)
    setResultado(null)
    const resposta = await sincronizarProspeccoes()
    setCarregando(false)
    if (resposta.erro) {
      setErro(resposta.erro)
      return
    }
    setResultado(
      `${resposta.totalSincronizados} estabelecimento(s) sincronizados.` +
        (resposta.erros && resposta.erros.length > 0 ? ` ${resposta.erros.length} erro(s) — ver console.` : '')
    )
    if (resposta.erros?.length) console.error('Erros na sincronização:', resposta.erros)
    router.refresh()
  }

  return (
    <div>
      <Botao carregando={carregando} onClick={sincronizar}>
        <RefreshCw className="h-4 w-4" /> Sincronizar com Google Maps agora
      </Botao>
      {carregando && <p className="mt-2 text-sm text-barro-500">Pode levar 1-2 minutos (várias categorias)...</p>}
      {resultado && <p className="mt-2 text-sm text-mata-700">{resultado}</p>}
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  )
}
