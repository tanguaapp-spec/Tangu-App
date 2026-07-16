'use client'

import { useState } from 'react'
import { Campo, AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { criarVaga } from '@/lib/actions/admin-actions'

export function FormularioCriarVaga() {
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    await criarVaga(formData)
    setCarregando(false)
    setEnviado(true)
    setTimeout(() => setEnviado(false), 2500)
  }

  return (
    <form action={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <Campo name="titulo" id="titulo" rotulo="Título da vaga" placeholder="Ex: Auxiliar administrativo" required />
      <Campo name="empresa_nome" id="empresa_nome" rotulo="Empresa" placeholder="Nome da empresa" required />
      <Campo name="area" id="area" rotulo="Área" placeholder="Ex: Administrativo, Comércio..." />
      <Campo name="tipo_contrato" id="tipo_contrato" rotulo="Tipo de contrato" placeholder="CLT, PJ, temporário..." />
      <Campo name="salario_faixa" id="salario_faixa" rotulo="Faixa salarial" placeholder="Ex: R$ 1.500 a R$ 1.800" />
      <Campo name="bairro" id="bairro" rotulo="Bairro" placeholder="Centro, Manilha..." />
      <Campo name="contato_whatsapp" id="contato_whatsapp" rotulo="WhatsApp para contato" placeholder="(21) 99999-9999" />
      <div className="sm:col-span-2">
        <AreaTexto name="descricao" id="descricao" rotulo="Descrição da vaga" placeholder="Detalhes, requisitos, horário..." required />
      </div>
      {enviado && <p className="text-sm text-mata-600 sm:col-span-2">Vaga publicada com sucesso!</p>}
      <Botao type="submit" carregando={carregando} className="sm:col-span-2 self-start">
        Publicar vaga
      </Botao>
    </form>
  )
}
