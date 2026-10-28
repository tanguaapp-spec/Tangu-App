'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import Link from 'next/link'
import { CalendarPlus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Botao } from '@/components/ui/botao'
import { sugerirEvento } from '@/lib/actions/conteudo-actions'

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base text-barro-900'

/** Morador sugere um evento; entra na agenda depois da revisão do time. */
export function SugerirEvento({ logado }: { logado: boolean }) {
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
        <CalendarPlus className="h-4 w-4" aria-hidden="true" /> Sugerir um evento
      </button>
      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo={ok ? 'Recebemos!' : 'Sugerir um evento'}>
        {!logado ? (
          <div className="flex flex-col gap-3">
            <p className="text-barro-800">Entre na sua conta para sugerir um evento. Leva menos de um minuto.</p>
            <Link href="/entrar?next=/agenda" className="flex min-h-12 items-center justify-center rounded-2xl bg-laranja font-bold text-tinta">
              Entrar
            </Link>
          </div>
        ) : ok ? (
          <div className="flex flex-col gap-3">
            <p className="text-barro-800">Obrigado! O time confere as informações e o evento aparece na agenda. Você recebe um aviso quando for publicado.</p>
            <Botao onClick={() => setAberto(false)}>Fechar</Botao>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            action={async (fd) => {
              setEnviando(true)
              setErro(null)
              const r = await chamarAcao(sugerirEvento(fd))
              setEnviando(false)
              if (r.erro) setErro(r.erro)
              else setOk(true)
            }}
          >
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Nome do evento
              <input name="titulo" required maxLength={140} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Quando
              <input name="data_evento" type="datetime-local" required className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Onde
              <input name="local_evento" required maxLength={160} placeholder="Ex.: Praça da Matriz" className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Sobre o evento
              <textarea name="descricao" required rows={3} maxLength={2000} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Contato (opcional, aparece no evento)
              <input name="contato" maxLength={120} placeholder="WhatsApp ou Instagram do organizador" className={campo} />
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
