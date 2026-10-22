'use client'

import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { redefinirSenha } from '@/lib/actions/auth-actions'

export function FormularioRedefinirSenha() {
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await redefinirSenha(formData)
    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <Campo type="password" name="senha" id="senha" rotulo="Nova senha" minLength={8} autoComplete="new-password" required />
      <Campo
        type="password"
        name="confirmacao"
        id="confirmacao"
        rotulo="Repita a nova senha"
        minLength={8}
        autoComplete="new-password"
        required
      />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <Botao type="submit" carregando={carregando}>
        Salvar nova senha
      </Botao>
    </form>
  )
}
