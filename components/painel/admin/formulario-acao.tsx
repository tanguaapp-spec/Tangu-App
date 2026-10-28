'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Botao } from '@/components/ui/botao'

/**
 * Formulário genérico pra server actions de admin que devolvem { erro }.
 * Mostra sucesso/erro na hora e atualiza a página.
 */
export function FormularioAcao({
  acao,
  children,
  rotuloBotao = 'Salvar',
  className,
}: {
  acao: (formData: FormData) => Promise<{ erro?: string | null }>
  children: React.ReactNode
  rotuloBotao?: string
  className?: string
}) {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const router = useRouter()

  return (
    <form
      className={className}
      action={async (formData) => {
        setCarregando(true)
        setErro(null)
        setOk(false)
        const r = await chamarAcao(acao(formData))
        setCarregando(false)
        if (r.erro) setErro(r.erro)
        else {
          setOk(true)
          router.refresh()
        }
      }}
    >
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Botao type="submit" tamanho="sm" carregando={carregando}>
          {rotuloBotao}
        </Botao>
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        {ok && (
          <p role="status" className="text-sm text-mata-700">
            Salvo.
          </p>
        )}
      </div>
    </form>
  )
}
