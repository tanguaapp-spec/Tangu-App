import type { Metadata } from 'next'
import { FormularioComunicado } from '@/components/painel/admin/formulario-comunicado'

export const metadata: Metadata = { title: 'Comunicados', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default function PaginaComunicados() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold text-barro-900">Comunicados</h1>
      <p className="text-barro-600">
        Manda um aviso no sino do app (e push pra quem ativou). Pro público geral, quem desligou “Avisos do mural” não recebe. Use com moderação: aviso demais faz a
        pessoa desligar tudo.
      </p>
      <div className="mt-5 rounded-[20px] border border-barro-200/80 bg-superficie p-4">
        <FormularioComunicado />
      </div>
    </div>
  )
}
