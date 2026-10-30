'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { enviarLinkAcesso } from '@/lib/actions/acesso-actions'

/**
 * Gera o link de nova senha e mostra o botão do WhatsApp com a mensagem
 * pronta (para o número que já está na conta). Gera na hora porque o link
 * vale só 1 hora.
 */
export function EnviarAcessoWhatsapp({ pedidoId, perfilId, rotulo = 'Gerar link e enviar no WhatsApp' }: { pedidoId?: string; perfilId?: string; rotulo?: string }) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  async function gerar() {
    setCarregando(true)
    setErro(null)
    const fd = new FormData()
    if (pedidoId) fd.set('pedido_id', pedidoId)
    if (perfilId) fd.set('perfil_id', perfilId)
    const r = await chamarAcao(enviarLinkAcesso(fd))
    setCarregando(false)
    if (r.erro) setErro(r.erro)
    else if (r.whatsapp) setWhatsapp(r.whatsapp)
  }

  if (whatsapp) {
    return (
      <div className="flex flex-col gap-1">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1F8A4C] px-4 text-sm font-bold text-white"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Abrir WhatsApp com a mensagem
        </a>
        <span className="text-xs text-barro-600">Link gerado agora: vale 1 hora. Se gerar de novo, o anterior deixa de funcionar.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={gerar}
        disabled={carregando}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-barro-300 bg-superficie px-4 text-sm font-semibold text-barro-900 disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> {carregando ? 'Gerando…' : rotulo}
      </button>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
