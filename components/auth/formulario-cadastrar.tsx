'use client'

import { useState } from 'react'
import { Campo } from '@/components/ui/campo'
import { Botao } from '@/components/ui/botao'
import { cadastrarComEmail } from '@/lib/actions/auth-actions'
import { cn } from '@/lib/utils'

export function FormularioCadastrar({
  papelInicial,
  codigoConvite,
}: {
  papelInicial: 'morador' | 'profissional'
  codigoConvite?: string
}) {
  const [papel, setPapel] = useState(papelInicial)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(formData: FormData) {
    setCarregando(true)
    setErro(null)
    formData.set('papel', papel)
    if (codigoConvite) formData.set('codigo_convite', codigoConvite)

    const resultado = await cadastrarComEmail(formData)

    if (resultado?.erro) {
      setErro(resultado.erro)
      setCarregando(false)
      return
    }

    // Sucesso: a server action deve redirecionar.
    // Se por algum motivo não redirecionar, mostramos um fallback.
    setCarregando(false)
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div>
        <span className="text-sm font-medium text-barro-800">Eu sou</span>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPapel('morador')}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
              papel === 'morador' ? 'border-casca-500 bg-casca-50 text-casca-700' : 'border-barro-200 text-barro-600'
            )}
          >
            Morador
          </button>
          <button
            type="button"
            onClick={() => setPapel('profissional')}
            className={cn(
              'rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
              papel === 'profissional' ? 'border-casca-500 bg-casca-50 text-casca-700' : 'border-barro-200 text-barro-600'
            )}
          >
            Profissional / Comércio
          </button>
        </div>
      </div>

      <Campo name="nomeCompleto" id="nomeCompleto" rotulo="Nome completo" placeholder="Seu nome" required />
      <Campo type="email" name="email" id="email" rotulo="E-mail" placeholder="voce@email.com" required />
      <Campo type="password" name="senha" id="senha" rotulo="Senha" placeholder="Mínimo 6 caracteres" minLength={6} required />

      <label htmlFor="aceite-termos" className="flex items-start gap-2 text-sm text-barro-600">
        <input
          type="checkbox"
          id="aceite-termos"
          name="aceiteTermos"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-barro-300 text-casca-600 focus:ring-casca-500"
        />
        <span>
          Li e concordo com os{' '}
          <a href="/termos" target="_blank" rel="noopener noreferrer" className="font-medium text-casca-600 hover:underline">
            Termos de Uso
          </a>{' '}
          e a{' '}
          <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-medium text-casca-600 hover:underline">
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Botao type="submit" carregando={carregando} className="mt-2">
        Criar minha conta
      </Botao>
    </form>
  )
}
