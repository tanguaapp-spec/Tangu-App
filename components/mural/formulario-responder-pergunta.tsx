'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { buscarNegociosParaIndicar, responderPergunta } from '@/lib/actions/mural-actions'

interface Resultado {
  id: string
  nome: string
  categoria: { nome: string } | null
}

export function FormularioResponderPergunta({ avisoId, logado }: { avisoId: string; logado: boolean }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [enviandoId, setEnviandoId] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function buscar(e: React.FormEvent) {
    e.preventDefault()
    setBuscando(true)
    setErro(null)
    const dados = await buscarNegociosParaIndicar(termo)
    setResultados(dados)
    setBuscando(false)
  }

  async function indicar(negocioId: string) {
    setEnviandoId(negocioId)
    setErro(null)
    const resultado = await responderPergunta(avisoId, negocioId)
    setEnviandoId(null)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setAberto(false)
    setResultados([])
    setTermo('')
    router.refresh()
  }

  if (!logado) return null

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} className="mt-2 text-sm font-medium text-casca-600 hover:underline">
        Indicar um negócio
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-lg border border-barro-100 bg-barro-50 p-3">
      <form onSubmit={buscar} className="flex gap-2">
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Nome do negócio..."
          className="w-full rounded-lg border border-barro-300 bg-white px-3 py-1.5 text-sm text-barro-900 focus:border-casca-500 focus:ring-2 focus:ring-casca-100"
        />
        <button type="submit" className="shrink-0 rounded-lg bg-barro-800 px-3 py-1.5 text-white">
          <Search className="h-4 w-4" />
        </button>
      </form>

      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}

      {buscando && <p className="mt-2 text-xs text-barro-500">Buscando...</p>}

      {resultados.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {resultados.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-1.5 text-sm">
              <span>
                {r.nome} {r.categoria && <span className="text-barro-400">· {r.categoria.nome}</span>}
              </span>
              <button
                onClick={() => indicar(r.id)}
                disabled={enviandoId === r.id}
                className="shrink-0 rounded-lg bg-mata-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-mata-600 disabled:opacity-60"
              >
                {enviandoId === r.id ? 'Indicando...' : 'Indicar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
