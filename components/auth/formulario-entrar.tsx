'use client'

import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { entrarComEmail } from '@/lib/actions/auth-actions'

export function FormularioEntrar() {
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await entrarComEmail(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Campo type="email" name="email" id="email" rotulo="E-mail" placeholder="voce@email.com" required />
      <Campo type="password" name="senha" id="senha" rotulo="Senha" placeholder="••••••••" required />
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Botao type="submit" carregando={carregando} className="mt-2">
        Entrar
      </Botao>
    </form>
  )
}
