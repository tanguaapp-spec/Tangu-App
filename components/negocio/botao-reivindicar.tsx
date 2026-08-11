'use client'

import { useMemo, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { AreaTexto } from '@/components/ui/campo'
import { solicitarReivindicacao } from '@/lib/actions/negocio-actions'

const WHATSAPP_NUMERO = '21972652314'

function criarLinkWhatsApp(mensagem: string) {
  const texto = encodeURIComponent(mensagem)
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${texto}`
}

export function BotaoReivindicar({ negocioId }: { negocioId: string }) {
  const [aberto, setAberto] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const linkWhatsApp = useMemo(() => {
    return criarLinkWhatsApp(
      `Oi! Fiz uma solicitação de reivindicação no app Cidade Conecta.\n\nNegócio: ${negocioId}\nMensagem: ${mensagem}`
    )
  }, [negocioId, mensagem])

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
      <div className="flex flex-col gap-3 rounded-xl bg-mata-50 p-4 text-sm text-mata-700">
        <p>Solicitação enviada! Vamos confirmar que você é o responsável e liberar o acesso em breve.</p>
        <a href={linkWhatsApp} target="_blank" rel="noreferrer">
          <Botao tamanho="sm" variante="secundario" className="w-full">
            Avisar no WhatsApp
          </Botao>
        </a>
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
