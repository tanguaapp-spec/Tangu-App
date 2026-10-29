'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { entrarComEmail } from '@/lib/actions/auth-actions'

export function FormularioEntrar({ proximo }: { proximo?: string }) {
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    const resultado = await chamarAcao(entrarComEmail(formData), { redireciona: true })
    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {proximo && <input type="hidden" name="next" value={proximo} />}
      <Campo type="email" name="email" id="email" rotulo="E-mail" placeholder="voce@email.com" autoComplete="email" required />
      <Campo
        type="password"
        name="senha"
        id="senha"
        rotulo="Senha"
        placeholder="••••••••"
        autoComplete="current-password"
        required
      />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <Botao type="submit" carregando={carregando} className="mt-2">
        Entrar
      </Botao>
    </form>
  )
}
