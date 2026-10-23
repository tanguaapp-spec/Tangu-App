'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { atualizarAvatar } from '@/lib/actions/perfil-actions'
import { useSessao } from '@/components/layout/sessao'

/** Foto do perfil: toca na foto, escolhe da galeria ou câmera. */
export function TrocarAvatar({ url, nome }: { url: string | null; nome: string }) {
  const entrada = useRef<HTMLInputElement>(null)
  const [atual, setAtual] = useState(url)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const { recarregar } = useSessao()

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        aria-label="Trocar foto do perfil"
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] bg-mata-100"
      >
        {atual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={atual} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-display text-2xl font-bold text-mata-700">{nome.charAt(0).toUpperCase()}</span>
        )}
        <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-tl-lg bg-serra text-white">
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Camera className="h-3.5 w-3.5" aria-hidden="true" />}
        </span>
      </button>
      <input
        ref={entrada}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const arquivo = e.target.files?.[0]
          if (!arquivo) return
          setEnviando(true)
          setErro(null)
          const dados = new FormData()
          dados.set('foto', arquivo)
          const r = await atualizarAvatar(dados)
          setEnviando(false)
          if (r.erro) setErro(r.erro)
          else {
            setAtual(r.url ?? null)
            recarregar()
          }
          e.target.value = ''
        }}
      />
      {erro && (
        <span role="alert" className="text-xs text-red-700">
          {erro}
        </span>
      )}
    </div>
  )
}
