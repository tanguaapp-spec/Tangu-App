'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { responderAvaliacao } from '@/lib/actions/painel-negocio-actions'
import type { Avaliacao, Perfil } from '@/lib/types/database'

type AvaliacaoComAutor = Avaliacao & { autor?: Perfil | null }

function ItemAvaliacao({ avaliacao }: { avaliacao: AvaliacaoComAutor }) {
  const router = useRouter()
  const [respondendo, setRespondendo] = useState(false)
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    if (!resposta.trim()) return
    setEnviando(true)
    setErro(null)
    const result = await responderAvaliacao(avaliacao.id, resposta)
    setEnviando(false)
    if (result.erro) {
      setErro(result.erro)
      return
    }
    setRespondendo(false)
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-barro-100 bg-white p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-barro-800">{avaliacao.autor?.nome_completo ?? 'Morador'}</span>
        <span className="flex items-center gap-1 text-casca-500">
          {Array.from({ length: avaliacao.nota }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-current" />
          ))}
        </span>
      </div>
      {avaliacao.comentario && <p className="mt-1.5 text-sm text-barro-600">{avaliacao.comentario}</p>}
      {avaliacao.foto_url && (
        <div className="relative mt-2 h-32 w-full max-w-xs overflow-hidden rounded-lg bg-barro-100">
          <Image src={avaliacao.foto_url} alt="Foto enviada na avaliação" fill className="object-cover" />
        </div>
      )}

      {avaliacao.resposta_profissional ? (
        <div className="mt-2 rounded-lg bg-barro-50 p-2.5 text-sm text-barro-700">
          <span className="font-semibold">Sua resposta:</span> {avaliacao.resposta_profissional}
        </div>
      ) : respondendo ? (
        <div className="mt-2">
          <AreaTexto
            rotulo="Responder"
            id={`resposta-${avaliacao.id}`}
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            rows={2}
            placeholder="Agradeça ou esclareça algo pra quem está lendo..."
          />
          {erro && <p className="mt-1 text-sm text-red-600">{erro}</p>}
          <div className="mt-2 flex gap-2">
            <Botao tamanho="sm" carregando={enviando} onClick={enviar}>
              Enviar resposta
            </Botao>
            <Botao tamanho="sm" variante="fantasma" onClick={() => setRespondendo(false)}>
              Cancelar
            </Botao>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setRespondendo(true)}
          className="mt-2 text-sm font-medium text-casca-600 hover:underline"
        >
          Responder avaliação
        </button>
      )}
    </div>
  )
}

export function ListaAvaliacoes({ avaliacoes }: { avaliacoes: AvaliacaoComAutor[] }) {
  if (avaliacoes.length === 0) {
    return <p className="text-sm text-barro-500">Nenhuma avaliação ainda.</p>
  }
  return (
    <div className="space-y-3">
      {avaliacoes.map((av) => (
        <ItemAvaliacao key={av.id} avaliacao={av} />
      ))}
    </div>
  )
}
