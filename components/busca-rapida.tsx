'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

export function BuscaRapida() {
  const router = useRouter()
  const [termo, setTermo] = useState('')

  function buscar(e: FormEvent) {
    e.preventDefault()
    router.push(termo ? `/buscar?q=${encodeURIComponent(termo)}` : '/buscar')
  }

  return (
    <form
      onSubmit={buscar}
      className="flex w-full max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-feira-lg"
    >
      <Search className="ml-3 h-5 w-5 shrink-0 text-barro-300" />
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder="Eletricista, salão, marcenaria, mercado..."
        className="w-full bg-transparent py-2.5 text-barro-900 placeholder:text-barro-300 focus:outline-none"
        aria-label="Buscar profissional ou comércio"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-casca-700 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-casca-800"
      >
        Buscar
      </button>
    </form>
  )
}
