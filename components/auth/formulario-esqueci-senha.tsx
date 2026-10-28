'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { solicitarRedefinicaoSenha } from '@/lib/actions/auth-actions'

export function FormularioEsqueciSenha() {
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await chamarAcao(solicitarRedefinicaoSenha(formData))
    setCarregando(false)
    if (resultado.erro) setErro(resultado.erro)
    if (resultado.enviado) setEnviado(true)
  }

  if (enviado) {
    return (
      <div role="status" className="rounded-xl bg-mata-50 p-4 text-sm text-mata-800">
        <MailCheck className="mb-2 h-6 w-6" aria-hidden="true" />
        Se existir uma conta com esse e-mail, você vai receber um link pra criar uma nova senha em alguns minutos.
        Confira também a caixa de spam. O link vale por 1 hora.
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Campo type="email" name="email" id="email" rotulo="E-mail da sua conta" autoComplete="email" required />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <Botao type="submit" carregando={carregando}>
        Enviar link de redefinição
      </Botao>
    </form>
  )
}
