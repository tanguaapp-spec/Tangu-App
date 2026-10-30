'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { pedirAcessoPeloWhatsapp } from '@/lib/actions/acesso-actions'

/** Segunda opção do "Esqueci minha senha": o time manda o link no WhatsApp que já está na conta. */
export function PedirAcessoWhatsapp() {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const r = await chamarAcao(pedirAcessoPeloWhatsapp(formData))
    setCarregando(false)
    if (r.erro) setErro(r.erro)
    if (r.enviado) setEnviado(true)
  }

  if (enviado) {
    return (
      <div role="status" className="rounded-xl bg-mata-50 p-4 text-sm text-mata-800">
        <MessageCircle className="mb-2 h-6 w-6" aria-hidden="true" />
        Pedido recebido. Se esse e-mail tiver conta com WhatsApp cadastrado, nossa equipe manda o link de nova senha nesse número assim que
        possível. O link vale por 1 hora depois de chegar.
      </div>
    )
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-barro-300 px-4 text-sm font-semibold text-barro-800">
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> Não chegou o e-mail? Receber pelo WhatsApp
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-barro-200 p-4">
      <p className="text-sm text-barro-700">
        Nossa equipe envia um link exclusivo para o WhatsApp que <b>já está cadastrado</b> na sua conta (no seu perfil ou no seu negócio). Por
        segurança, não dá para escolher outro número.
      </p>
      <Campo type="email" name="email" id="email-whatsapp" rotulo="E-mail da sua conta" autoComplete="email" required />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <Botao type="submit" variante="secundario" carregando={carregando}>
        Pedir link pelo WhatsApp
      </Botao>
    </form>
  )
}
