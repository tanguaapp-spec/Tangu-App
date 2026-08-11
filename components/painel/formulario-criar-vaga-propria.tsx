'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarVagaProfissional } from '@/lib/actions/painel-negocio-actions'

export function FormularioCriarVagaPropria({ negocioId }: { negocioId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await criarVagaProfissional(negocioId, formData)
    setCarregando(false)
    if (resultado?.erro) {
      setErro(resultado.erro)
      return
    }
    setEnviado(true)
    router.refresh()
    setTimeout(() => setEnviado(false), 2500)
  }

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <Campo name="titulo" id="titulo" rotulo="Título da vaga" placeholder="Ex: Auxiliar de cozinha" required />
      <Campo name="area" id="area" rotulo="Área" placeholder="Ex: Comércio, produção..." />
      <Campo name="tipo_contrato" id="tipo_contrato" rotulo="Tipo de contrato" placeholder="CLT, PJ, temporário..." />
      <Campo name="salario_faixa" id="salario_faixa" rotulo="Faixa salarial" placeholder="Ex: R$ 1.500 a R$ 1.800" />
      <Campo name="bairro" id="bairro" rotulo="Bairro" placeholder="Centro, Manilha..." />
      <Campo name="contato_whatsapp" id="contato_whatsapp" rotulo="WhatsApp para contato" placeholder="(21) 99999-9999" />
      <div className="sm:col-span-2">
        <AreaTexto name="descricao" id="descricao" rotulo="Descrição da vaga" placeholder="Detalhes, requisitos, horário..." required />
      </div>
      {erro && <p className="text-sm text-red-600 sm:col-span-2">{erro}</p>}
      {enviado && <p className="text-sm text-mata-600 sm:col-span-2">Vaga publicada com sucesso!</p>}
      <Botao type="submit" carregando={carregando} className="sm:col-span-2 self-start">
        Publicar vaga
      </Botao>
    </form>
  )
}
