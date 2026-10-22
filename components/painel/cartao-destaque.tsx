import Link from 'next/link'
import { Sparkles } from 'lucide-react'

/**
 * Antes o destaque era vendido por WhatsApp e ligado à mão pelo admin.
 * Agora vem do plano Destaque, contratado pelo próprio dono.
 */
export function CartaoDestaque({
  destaqueAtivo,
  destaqueExpiraEm,
}: {
  destaqueAtivo: boolean
  destaqueExpiraEm: string | null
}) {
  return (
    <div className="mt-8 rounded-casca border border-casca-200 bg-casca-50 p-6 shadow-feira">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-barro-900">
        <Sparkles className="h-5 w-5 text-casca-500" aria-hidden="true" />
        Destaque no diretório
      </h2>

      {destaqueAtivo ? (
        <p className="mt-2 text-sm text-barro-700">
          Seu negócio está em destaque
          {destaqueExpiraEm && ` até ${new Date(destaqueExpiraEm).toLocaleDateString('pt-BR')}`} — aparece primeiro na busca
          e na página inicial.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-barro-700">
            No plano Destaque seu negócio aparece primeiro na busca e na página inicial. Você contrata e cancela por aqui
            mesmo, sem fidelidade.
          </p>
          <Link
            href="/painel/negocio/assinatura"
            className="mt-4 inline-flex rounded-lg bg-casca-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-casca-800"
          >
            Ver planos
          </Link>
        </>
      )}
    </div>
  )
}
