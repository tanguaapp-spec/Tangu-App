'use client'

import Link from 'next/link'
import { Home } from 'lucide-react'
import { Botao } from '@/components/ui/botao'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-feira px-4 py-20">
      <div className="text-center">
        <div className="text-9xl font-display text-casca-500 mb-6">404</div>
        <h1 className="text-3xl font-display font-semibold text-barro-900 mb-4">Página não encontrada</h1>
        <p className="text-barro-600 mb-8 max-w-md mx-auto">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/">
          <Botao>
          <Home className="h-4 w-4 mr-2" />
            Voltar para a página inicial
          </Botao>
        </Link>
      </div>
    </div>
  )
}
