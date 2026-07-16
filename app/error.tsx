'use client'

import { useEffect } from 'react'
import { RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'
import { Botao } from '@/components/ui/botao'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erro global:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-feira px-4 py-20">
      <div className="text-center">
        <div className="text-6xl font-display text-casca-500 mb-6">Ops!</div>
        <h1 className="text-3xl font-display font-semibold text-barro-900 mb-4">Algo deu errado</h1>
        <p className="text-barro-600 mb-8 max-w-md mx-auto">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Botao onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Botao>
          <Link href="/">
            <Botao variante="fantasma">
              <Home className="h-4 w-4 mr-2" />
              Voltar para a página inicial
            </Botao>
          </Link>
        </div>
      </div>
    </div>
  )
}
