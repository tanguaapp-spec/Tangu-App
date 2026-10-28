'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Newspaper } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Botao } from '@/components/ui/botao'
import { sugerirNoticia } from '@/lib/actions/conteudo-actions'

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base text-barro-900'

/** Morador manda uma pauta; o time confere antes de publicar. */
export function SugerirNoticia({ logado }: { logado: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border-[1.5px] border-barro-200 bg-superficie px-4 text-sm font-semibold text-barro-900"
      >
        <Newspaper className="h-4 w-4" aria-hidden="true" /> Sugerir uma notícia
      </button>
      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo={ok ? 'Recebemos!' : 'Sugerir uma notícia'}>
        {!logado ? (
          <div className="flex flex-col gap-3">
            <p className="text-barro-800">Entre na sua conta para sugerir uma notícia.</p>
            <Link href="/entrar?next=/noticias" className="flex min-h-12 items-center justify-center rounded-2xl bg-laranja font-bold text-tinta">
              Entrar
            </Link>
          </div>
        ) : ok ? (
          <div className="flex flex-col gap-3">
            <p className="text-barro-800">Obrigado! O time confere as informações antes de publicar.</p>
            <Botao onClick={() => setAberto(false)}>Fechar</Botao>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            action={async (fd) => {
              setEnviando(true)
              setErro(null)
              const r = await sugerirNoticia(fd)
              setEnviando(false)
              if (r.erro) setErro(r.erro)
              else setOk(true)
            }}
          >
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Título
              <input name="titulo" required minLength={10} maxLength={160} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              O que aconteceu
              <textarea name="corpo" required minLength={30} rows={5} maxLength={4000} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Seu contato (opcional, só o time vê)
              <input name="contato" maxLength={120} className={campo} />
            </label>
            {erro && (
              <p role="alert" className="text-sm text-red-700">
                {erro}
              </p>
            )}
            <Botao type="submit" carregando={enviando}>
              {enviando ? 'Enviando…' : 'Enviar sugestão'}
            </Botao>
          </form>
        )}
      </BottomSheet>
    </>
  )
}
