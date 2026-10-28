'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Botao } from '@/components/ui/botao'
import { cn } from '@/lib/utils'

/** "De 0 a 10, quanto você recomendaria o Tanguá App?" Uma vez a cada 90 dias. */
export function PerguntaNps({ aoFechar }: { aoFechar: () => void }) {
  const [nota, setNota] = useState<number | null>(null)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const fechar = () => {
    try {
      localStorage.setItem('tangua-nps-em', String(Date.now()))
    } catch {}
    aoFechar()
  }

  return (
    <BottomSheet aberto onFechar={fechar} titulo={enviado ? 'Obrigado!' : 'Uma pergunta rápida'}>
      {enviado ? (
        <div className="flex flex-col gap-4">
          <p className="text-barro-800">Sua resposta ajuda a gente a melhorar o app pra cidade toda.</p>
          <Botao onClick={fechar}>Fechar</Botao>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-barro-800">De 0 a 10, quanto você recomendaria o Tanguá App pra um amigo ou vizinho?</p>
          <div role="radiogroup" aria-label="Nota de 0 a 10" className="grid grid-cols-6 gap-2 sm:grid-cols-11">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={nota === n}
                onClick={() => setNota(n)}
                className={cn('h-11 rounded-xl border font-mono font-bold', nota === n ? 'border-serra bg-serra text-white' : 'border-barro-200 bg-superficie text-barro-900')}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-barro-600">
            <span>Nada provável</span>
            <span>Com certeza</span>
          </div>
          {nota !== null && (
            <label className="flex flex-col gap-1 text-sm text-barro-700">
              {nota >= 9 ? 'O que você mais gosta?' : 'O que faria você dar uma nota maior?'} (opcional)
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={1000}
                rows={3}
                className="rounded-xl border border-barro-200 bg-superficie p-3 text-base"
              />
            </label>
          )}
          <Botao
            disabled={nota === null}
            carregando={enviando}
            onClick={async () => {
              setEnviando(true)
              await fetch('/api/nps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nota, comentario: comentario || undefined }),
              }).catch(() => undefined)
              setEnviando(false)
              setEnviado(true)
              try {
                localStorage.setItem('tangua-nps-em', String(Date.now()))
              } catch {}
            }}
          >
            Enviar
          </Botao>
          <button type="button" onClick={fechar} className="min-h-11 text-sm font-semibold text-barro-600">
            Agora não
          </button>
        </div>
      )}
    </BottomSheet>
  )
}
