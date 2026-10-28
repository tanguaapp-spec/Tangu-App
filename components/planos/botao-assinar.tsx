'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'
import { iniciarAssinatura } from '@/lib/actions/assinatura-actions'

export function BotaoAssinar({
  planoId,
  rotulo,
  variante = 'primario',
  confirmacao,
}: {
  planoId: string
  rotulo: string
  variante?: 'primario' | 'fantasma'
  /** texto de confirmação (ex.: troca de plano). Sem ele, vai direto. */
  confirmacao?: string
}) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const router = useRouter()

  async function assinar() {
    if (confirmacao && !window.confirm(confirmacao)) return
    setCarregando(true)
    setErro(null)
    const resultado = await chamarAcao(iniciarAssinatura(planoId))
    if (resultado.erro) {
      setErro(resultado.erro)
      setCarregando(false)
      return
    }
    if ('urlPagamento' in resultado && resultado.urlPagamento) {
      // checkout do Mercado Pago — o plano só vale quando o pagamento for confirmado
      window.location.href = resultado.urlPagamento
      return
    }
    setMensagem('Plano alterado.')
    setCarregando(false)
    router.refresh()
  }

  return (
    <div>
      <Botao onClick={assinar} carregando={carregando} variante={variante} className="w-full">
        {rotulo}
      </Botao>
      {erro && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {erro}
        </p>
      )}
      {mensagem && (
        <p role="status" className="mt-2 text-sm text-mata-700">
          {mensagem}
        </p>
      )}
    </div>
  )
}
