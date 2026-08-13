'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { AreaTexto } from '@/components/ui/campo'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { denunciarConteudo } from '@/lib/actions/moderacao-actions'
import { vibrar } from '@/lib/ui/vibrar'
import type { TipoConteudoDenuncia } from '@/lib/types/database'

export function BotaoDenunciar({
  tipoConteudo,
  conteudoId,
  negocioId,
  logado,
}: {
  tipoConteudo: TipoConteudoDenuncia
  conteudoId: string
  negocioId?: string | null
  logado: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [estado, setEstado] = useState<'idle' | 'enviado'>('idle')
  const [erro, setErro] = useState<string | null>(null)

  if (!logado) return null

  if (estado === 'enviado') {
    return <p className="mt-2 text-xs text-barro-400">Denúncia enviada — nossa equipe vai revisar.</p>
  }

  async function enviar() {
    setEnviando(true)
    setErro(null)
    const resultado = await denunciarConteudo(tipoConteudo, conteudoId, motivo, negocioId)
    setEnviando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    vibrar(12)
    setAberto(false)
    setEstado('enviado')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-2 flex items-center gap-1 text-xs text-barro-400 hover:text-red-500"
      >
        <Flag className="h-3 w-3" /> Denunciar
      </button>

      <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Denunciar conteúdo">
        <AreaTexto
          placeholder="O que há de errado com este conteúdo?"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="min-h-[80px] text-sm"
        />
        {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Botao tamanho="sm" variante="fantasma" onClick={() => setAberto(false)}>
            Cancelar
          </Botao>
          <Botao tamanho="sm" variante="perigo" carregando={enviando} onClick={enviar}>
            Enviar denúncia
          </Botao>
        </div>
      </BottomSheet>
    </>
  )
}
