'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarPergunta } from '@/lib/actions/mural-actions'
import { HelpCircle } from 'lucide-react'

export function FormularioPergunta() {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await criarPergunta(formData)
    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    setAberto(false)
    router.refresh()
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 rounded-xl border border-dashed border-barro-300 px-4 py-3 text-sm font-medium text-barro-600 hover:border-casca-400 hover:text-casca-700"
      >
        <HelpCircle className="h-4 w-4" /> Alguém indica um profissional? Pergunte pra cidade.
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-casca border border-barro-100 bg-white p-4 shadow-feira">
      <Campo
        name="titulo"
        id="pergunta_titulo"
        rotulo="Sua pergunta"
        placeholder="Ex: Alguém indica um eletricista de confiança no Centro?"
        required
      />
      <div className="mt-3">
        <Campo name="bairro" id="pergunta_bairro" rotulo="Bairro (opcional)" placeholder="Centro, Manilha..." />
      </div>
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <Botao type="submit" tamanho="sm" carregando={carregando}>
          Perguntar
        </Botao>
        <Botao type="button" tamanho="sm" variante="fantasma" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </form>
  )
}
