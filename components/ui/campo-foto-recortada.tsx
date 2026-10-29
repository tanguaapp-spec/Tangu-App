'use client'

import { useRef, useState } from 'react'
import { Crop } from 'lucide-react'
import { RecortarFoto, type Previa } from '@/components/ui/recortar-foto'

/**
 * Campo de foto de formulário com recorte: a pessoa escolhe a foto, ajusta
 * no recorte e o arquivo recortado vai no campo `name` (o resto do
 * formulário continua igual).
 */
export function CampoFotoRecortada({
  name,
  id,
  proporcao,
  previas,
  atual,
  rotulo = 'Escolher foto',
  dica,
}: {
  name: string
  id?: string
  proporcao: number
  previas?: Previa[]
  atual?: string | null
  rotulo?: string
  dica?: string
}) {
  const escolha = useRef<HTMLInputElement>(null)
  const enviado = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previa, setPrevia] = useState<string | null>(atual ?? null)

  return (
    <div className="flex flex-col gap-2">
      {previa && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previa} alt="Foto escolhida" className="w-full max-w-xs rounded-xl object-cover" style={{ aspectRatio: String(proporcao) }} />
      )}
      <button
        type="button"
        onClick={() => escolha.current?.click()}
        className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-barro-200 bg-superficie px-4 text-sm font-semibold text-barro-900 hover:bg-barro-50"
      >
        <Crop className="h-4 w-4" aria-hidden="true" /> {previa ? 'Trocar e recortar foto' : rotulo}
      </button>
      {dica && <p className="text-xs text-barro-500">{dica}</p>}
      {/* escolha da foto (sem nome: não vai no formulário; o recorte já sai reduzido) */}
      <input
        ref={escolha}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        data-compactado="1"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setArquivo(f)
          e.target.value = ''
        }}
      />
      {/* o que vai pro servidor */}
      <input ref={enviado} type="file" name={name} className="hidden" tabIndex={-1} aria-hidden="true" />
      {arquivo && (
        <RecortarFoto
          arquivo={arquivo}
          proporcao={proporcao}
          previas={previas}
          aoCancelar={() => setArquivo(null)}
          aoConfirmar={(foto, url) => {
            const dt = new DataTransfer()
            dt.items.add(foto)
            if (enviado.current) enviado.current.files = dt.files
            setPrevia(url)
            setArquivo(null)
          }}
        />
      )}
    </div>
  )
}
