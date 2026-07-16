'use client'

import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { AreaTexto } from '@/components/ui/campo'
import { solicitarReivindicacao } from '@/lib/actions/negocio-actions'

export function BotaoReivindicar({ negocioId }: { negocioId: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar() {
    setEnviando(true)
    const resultado = await solicitarReivindicacao(negocioId, mensagem)
    setEnviando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
    } else {
      setEnviado(true)
    }
  }

  if (enviado) {
    return (
      <div className="rounded-xl bg-mata-50 p-4 text-sm text-mata-700">
        Solicitação enviada! Vamos confirmar que você é o responsável e liberar o acesso em breve.
      </div>
    )
  }

  if (!aberto) {
    return (
      <Botao variante="fantasma" onClick={() => setAberto(true)} className="w-full">
        <ShieldCheck className="h-4 w-4" />
        Este negócio é seu? Reivindique o perfil
      </Botao>
    )
  }

  return (
    <div className="rounded-xl border border-barro-200 p-4">
      <p className="text-sm text-barro-700">
        Conte pra gente como podemos confirmar que você é o responsável (telefone, CNPJ, etc).
      </p>
      <AreaTexto
        className="mt-2"
        placeholder="Ex: Sou o proprietário, meu telefone é (21) 9...."
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />
      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      <div className="mt-3 flex gap-2">
        <Botao tamanho="sm" carregando={enviando} onClick={enviar}>
          Enviar solicitação
        </Botao>
        <Botao tamanho="sm" variante="fantasma" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
      </div>
    </div>
  )
}
