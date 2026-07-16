'use client'

import { useState } from 'react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarAviso } from '@/lib/actions/admin-actions'
import { cn } from '@/lib/utils'

const tipos = [
  { valor: 'aviso', rotulo: 'Aviso' },
  { valor: 'evento', rotulo: 'Evento' },
  { valor: 'utilidade_publica', rotulo: 'Utilidade pública' },
  { valor: 'achados_perdidos', rotulo: 'Achados e perdidos' },
]

export function FormularioCriarAviso() {
  const [tipo, setTipo] = useState('aviso')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    formData.set('tipo', tipo)
    await criarAviso(formData)
    setCarregando(false)
    setEnviado(true)
    setTimeout(() => setEnviado(false), 2500)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium text-barro-800">Tipo</span>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {tipos.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipo(t.valor)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                tipo === t.valor ? 'bg-casca-500 text-white' : 'bg-barro-100 text-barro-700'
              )}
            >
              {t.rotulo}
            </button>
          ))}
        </div>
      </div>

      <Campo name="titulo" id="titulo" rotulo="Título" required />
      <AreaTexto name="conteudo" id="conteudo" rotulo="Conteúdo" required />

      {tipo === 'evento' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo name="local_evento" id="local_evento" rotulo="Local" placeholder="Praça Central, Igreja..." />
          <Campo type="datetime-local" name="data_evento" id="data_evento" rotulo="Data e hora" />
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-barro-700">
        <input type="checkbox" name="fixado" className="rounded border-barro-300" />
        Fixar no topo do mural
      </label>

      {enviado && <p className="text-sm text-mata-600">Publicado no mural!</p>}
      <Botao type="submit" carregando={carregando} className="self-start">
        Publicar no mural
      </Botao>
    </form>
  )
}
