'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarCupom } from '@/lib/actions/painel-negocio-actions'

export function FormularioCriarCupom({ negocioId }: { negocioId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await criarCupom(negocioId, formData)
    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  // padrão: expira em 48h a partir de agora, pré-preenchido pra reduzir fricção
  const padraoExpira = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16)

  return (
    <form action={handleSubmit} className="grid gap-3 sm:grid-cols-3">
      <Campo name="titulo" id="cupom_titulo" rotulo="Título da oferta" placeholder="Ex: Fim de semana" required />
      <Campo name="desconto_texto" id="cupom_desconto" rotulo="Desconto" placeholder="Ex: 20% off, Leve 2 pague 1" required />
      <Campo type="datetime-local" name="expira_em" id="cupom_expira" rotulo="Expira em" defaultValue={padraoExpira} required />

      {erro && <p className="text-sm text-red-600 sm:col-span-3">{erro}</p>}

      <Botao type="submit" carregando={carregando} tamanho="sm" className="self-start sm:col-span-3">
        Publicar oferta relâmpago
      </Botao>
    </form>
  )
}
