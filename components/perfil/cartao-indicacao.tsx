import { Users } from 'lucide-react'
import { BotaoCopiarLink } from '@/components/painel/botao-copiar-link'

export function CartaoIndicacao({ codigoConvite, totalIndicados }: { codigoConvite: string; totalIndicados: number }) {
  const urlConvite = `https://tangua-app.vercel.app/cadastrar?convite=${codigoConvite}`
  const mensagem = `Entra no Tanguá App! É o app da nossa cidade — profissionais, vagas e avisos de Tanguá num só lugar. ${urlConvite}`

  return (
    <div className="rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-semibold text-barro-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-mata-600 text-white">
          <Users className="h-4 w-4" />
        </span>
        Indique um vizinho
      </h2>
      <p className="mt-1 text-sm text-barro-600">
        Compartilhe seu link e ajude a cidade toda a se conectar.
        {totalIndicados > 0 && (
          <span className="font-medium text-mata-700"> Você já trouxe {totalIndicados} {totalIndicados === 1 ? 'vizinho' : 'vizinhos'}.</span>
        )}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="rounded-lg bg-barro-50 px-3 py-2 text-sm text-barro-700 break-all">{urlConvite}</div>
        <div className="flex flex-wrap gap-2">
          <BotaoCopiarLink texto={urlConvite} />
          <a href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`} target="_blank" rel="noopener noreferrer">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-mata-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-mata-600"
            >
              Compartilhar no WhatsApp
            </button>
          </a>
        </div>
      </div>
    </div>
  )
}
