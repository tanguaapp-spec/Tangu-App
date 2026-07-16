'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Campo } from '@/components/ui/campo'
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
  const [enviando, setEnviando] = useState(false)

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nota === 0) return
    setEnviando(true)
    const result = await enviarAvaliacao(negocioId, nota, comentario)
    if (!result.erro) {
      router.refresh()
    }
    setEnviando(false)
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

      <Campo
        label="Comentário (opcional)"
        id="comentario"
        as="textarea"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
      />

      <Botao type="submit" className="mt-4" disabled={enviando || nota === 0}>
        {enviando ? 'Enviando...' : 'Enviar avaliação'}
      </Botao>
    </form>
  )
}
