'use client'

import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { AreaTexto } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { atualizarNegocio } from '@/lib/actions/painel-negocio-actions'
import type { Negocio } from '@/lib/types/database'

export function FormularioEditarNegocio({ negocio }: { negocio: Negocio }) {
  const [carregando, setCarregando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setSalvo(false)
    await atualizarNegocio(negocio.id, formData)
    setCarregando(false)
    setSalvo(true)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <AreaTexto
        name="descricao"
        id="descricao"
        rotulo="Descrição do negócio"
        defaultValue={negocio.descricao ?? ''}
        placeholder="Conte pra cidade o que você faz, seus diferenciais..."
      />
      <Campo name="whatsapp" id="whatsapp" rotulo="WhatsApp" defaultValue={negocio.whatsapp ?? ''} placeholder="(21) 99999-9999" />
      <Campo name="instagram" id="instagram" rotulo="Instagram" defaultValue={negocio.instagram ?? ''} placeholder="@seuusuario" />
      <Campo name="site" id="site" rotulo="Site" defaultValue={negocio.site ?? ''} placeholder="https://" />
      <Campo name="endereco" id="endereco" rotulo="Endereço" defaultValue={negocio.endereco ?? ''} />

      {salvo && <p className="text-sm text-mata-600">Dados salvos com sucesso.</p>}
      <Botao type="submit" carregando={carregando} className="self-start">
        Salvar alterações
      </Botao>
    </form>
  )
}
