'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { criarPost } from '@/lib/actions/painel-negocio-actions'
import { cn } from '@/lib/utils'

const tipos = [
  { valor: 'novidade', rotulo: 'Novidade' },
  { valor: 'promocao', rotulo: 'Promoção' },
]

const campo =
  'w-full rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-3.5 text-[15px] text-barro-900 placeholder:text-barro-400 focus:border-serra focus:outline-none'

export function FormularioCriarPost({ negocioId }: { negocioId: string }) {
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const [tipo, setTipo] = useState('novidade')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [previa, setPrevia] = useState<string | null>(null)

  return (
    <form
      ref={form}
      action={async (dados) => {
        setCarregando(true)
        setErro(null)
        dados.set('tipo', tipo)
        const r = await chamarAcao(criarPost(negocioId, dados))
        setCarregando(false)
        if (r?.erro) {
          setErro(r.erro)
          return
        }
        form.current?.reset()
        setPrevia(null)
        setEnviado(true)
        router.refresh()
        setTimeout(() => setEnviado(false), 4000)
      }}
      className="flex flex-col gap-3"
    >
      <div role="radiogroup" aria-label="Tipo" className="flex gap-2">
        {tipos.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tipo === t.valor}
            onClick={() => setTipo(t.valor)}
            className={cn('h-10 rounded-full px-4 text-sm font-semibold', tipo === t.valor ? 'bg-serra text-white' : 'border border-barro-200 text-barro-900')}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="titulo-post">
        Título
      </label>
      <input id="titulo-post" name="titulo" required maxLength={120} placeholder="Ex: Chegou açaí de 500ml!" className={`${campo} h-12`} />
      <label className="sr-only" htmlFor="conteudo-post">
        Detalhes
      </label>
      <textarea id="conteudo-post" name="conteudo" maxLength={2000} placeholder="Conte os detalhes (opcional)" className={`${campo} min-h-[90px] py-2.5`} />
      <label className="flex cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-barro-200 p-2.5 text-sm font-semibold text-barro-700">
        {previa ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previa} alt="" className="h-14 w-14 rounded-xl object-cover" />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-feira">
            <Camera className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
        {previa ? 'Trocar foto' : 'Adicionar foto (opcional)'}
        <input
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) setPrevia(URL.createObjectURL(f))
          }}
        />
      </label>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      {enviado && (
        <p role="status" className="rounded-[14px] bg-mata-100 p-3 text-sm font-semibold text-mata-700">
          Publicado! Já aparece no seu perfil e quem favoritou foi avisado.
        </p>
      )}
      <button disabled={carregando} className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-laranja font-bold text-tinta disabled:opacity-60">
        {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Publicar
      </button>
    </form>
  )
}
