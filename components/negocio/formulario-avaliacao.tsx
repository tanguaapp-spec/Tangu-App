'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { enviarAvaliacao } from '@/lib/actions/negocio-actions'
import { useRouter } from 'next/navigation'

interface Props {
  negocioId: string
}

export function FormularioAvaliacao({ negocioId }: Props) {
  const router = useRouter()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nota === 0) return
    setEnviando(true)
    setErro(null)
    try {
      const formData = new FormData()
      formData.set('nota', String(nota))
      formData.set('comentario', comentario)
      if (foto) formData.set('foto', foto)
      const result = await enviarAvaliacao(negocioId, formData)
      if (!result.erro) {
        setFoto(null)
        router.refresh()
      } else {
        setErro(result.erro)
      }
    } catch {
      setErro('Não foi possível enviar sua avaliação. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={handleEnviar} className="mt-6 rounded-xl border border-barro-100 bg-white p-4">
      <h4 className="font-semibold text-barro-900 mb-3">Deixe sua avaliação</h4>

      <div className="flex gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNota(n)}
            className="p-1"
          >
            <Star
              className={`w-7 h-7 ${
                n <= nota ? 'fill-casca-400 text-casca-400' : 'text-barro-300'
              }`}
            />
          </button>
        ))}
      </div>

      <AreaTexto
        rotulo="Comentário (opcional)"
        id="comentario"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
      />

      <div className="mt-3">
        <label htmlFor="foto-avaliacao" className="text-sm font-medium text-barro-800">
          Foto (opcional)
        </label>
        <input
          type="file"
          id="foto-avaliacao"
          accept="image/*"
          onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
          className="mt-1.5 block w-full text-sm text-barro-600 file:mr-3 file:rounded-lg file:border-0 file:bg-barro-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-barro-700 hover:file:bg-barro-200"
        />
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}

      <Botao type="submit" className="mt-4" disabled={enviando || nota === 0}>
        {enviando ? 'Enviando...' : 'Enviar avaliação'}
      </Botao>
    </form>
  )
}
