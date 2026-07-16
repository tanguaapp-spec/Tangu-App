'use client'

import { useState } from 'react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarPost } from '@/lib/actions/painel-negocio-actions'
import { cn } from '@/lib/utils'

const tipos = [
  { valor: 'novidade', rotulo: 'Novidade' },
  { valor: 'promocao', rotulo: 'Promoção' },
  { valor: 'vaga_propria', rotulo: 'Vaga própria' },
]

export function FormularioCriarPost({ negocioId }: { negocioId: string }) {
  const [tipo, setTipo] = useState('novidade')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    formData.set('tipo', tipo)
    await criarPost(negocioId, formData)
    setCarregando(false)
    setEnviado(true)
    setTimeout(() => setEnviado(false), 2500)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium text-barro-800">Tipo de post</span>
        <div className="mt-1.5 flex gap-2">
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

      <Campo name="titulo" id="titulo" rotulo="Título" placeholder="Ex: Promoção de inverno!" required />
      <AreaTexto name="conteudo" id="conteudo" rotulo="Detalhes" placeholder="Conte os detalhes da novidade..." />

      {enviado && <p className="text-sm text-mata-600">Publicado! Já está visível no seu perfil.</p>}
      <Botao type="submit" carregando={carregando} className="self-start">
        Publicar
      </Botao>
    </form>
  )
}
