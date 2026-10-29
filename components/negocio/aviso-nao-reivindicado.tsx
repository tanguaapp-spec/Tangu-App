'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Botao } from '@/components/ui/botao'
import { BotaoReivindicar } from '@/components/negocio/botao-reivindicar'
import { AssumirPorCodigo } from '@/components/negocio/assumir-por-codigo'
import { pedirOcultarPerfil } from '@/lib/actions/negocio-actions'

const campo = 'w-full rounded-[14px] border border-barro-200 bg-superficie px-3 py-3 text-base text-barro-900'

/**
 * Perfil criado pela plataforma (lista pública). Explica ao dono, com
 * cuidado, por que o comércio dele está aqui e dá as duas saídas: assumir
 * de graça ou pedir para ocultar.
 */
export function AvisoNaoReivindicado({
  negocioId,
  nome,
  temTelefone = false,
  logado = false,
  caminho = '/',
}: {
  negocioId: string
  nome: string
  /** tem WhatsApp/telefone no cadastro: dá pra assumir por código */
  temTelefone?: boolean
  logado?: boolean
  caminho?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  return (
    <section id="reivindicar" aria-label="Reivindicar este perfil" className="flex scroll-mt-24 flex-col gap-3 rounded-[22px] border-2 border-laranja bg-casca-50 p-4 text-barro-900">
      <div className="flex gap-3">
        <HeartHandshake className="mt-0.5 h-6 w-6 shrink-0 text-casca-700" aria-hidden="true" />
        <div className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
          <b className="font-display text-lg">É o dono de {nome}?</b>
          <p>
            Este perfil foi criado pelo Tanguá App com informações públicas, para facilitar o cadastro e ajudar quem procura o seu
            comércio a encontrar você mais rápido. Não cobramos nada por isso e não vendemos nada em seu nome.
          </p>
          <p>
            Você pode assumir o perfil de graça para corrigir os dados e colocar fotos, preços e ofertas. Se preferir não aparecer, é só
            pedir: a gente oculta, sem problema nenhum. Nós do Tanguá App só queremos ajudar o comércio da cidade.
          </p>
        </div>
      </div>
      {temTelefone && <AssumirPorCodigo negocioId={negocioId} logado={logado} voltarPara={caminho} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {temTelefone ? (
          <details className="text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-barro-700 underline underline-offset-4">O número mudou? Peça de outro jeito</summary>
            <div className="mt-2">
              <BotaoReivindicar negocioId={negocioId} />
            </div>
          </details>
        ) : (
          <BotaoReivindicar negocioId={negocioId} />
        )}
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="min-h-11 rounded-[14px] px-3 text-sm font-semibold text-barro-700 underline underline-offset-4"
        >
          Prefiro que oculte este perfil
        </button>
      </div>

      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo={ok ? 'Pedido recebido' : 'Ocultar este perfil'}>
        {ok ? (
          <div className="flex flex-col gap-3">
            <p className="text-barro-800">Obrigado por avisar. A gente confirma pelo contato que você deixou e tira o perfil do ar.</p>
            <Botao onClick={() => setAberto(false)}>Fechar</Botao>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            action={async (fd) => {
              setEnviando(true)
              setErro(null)
              const r = await chamarAcao(pedirOcultarPerfil(fd))
              setEnviando(false)
              if (r.erro) setErro(r.erro)
              else setOk(true)
            }}
          >
            <input type="hidden" name="negocio_id" value={negocioId} />
            <p className="text-sm text-barro-700">Sem problema. Deixe um contato só para confirmarmos que é você.</p>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Seu nome
              <input name="nome" required maxLength={100} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              WhatsApp ou e-mail
              <input name="contato" required maxLength={120} className={campo} />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold text-barro-800">
              Quer contar o motivo? (opcional)
              <textarea name="motivo" rows={2} maxLength={500} className={campo} />
            </label>
            {erro && (
              <p role="alert" className="text-sm text-red-700">
                {erro}
              </p>
            )}
            <Botao type="submit" carregando={enviando}>
              {enviando ? 'Enviando…' : 'Pedir para ocultar'}
            </Botao>
          </form>
        )}
      </BottomSheet>
    </section>
  )
}
