import { cn } from '@/lib/utils'

export type MensagemChamado = { id: string; corpo: string; do_suporte: boolean; criado_em: string }

/** Linha do tempo do chamado — usada pelo usuário e pelo admin. */
export function ConversaChamado({ mensagens, visaoSuporte }: { mensagens: MensagemChamado[]; visaoSuporte?: boolean }) {
  if (mensagens.length === 0) return <p className="text-sm text-barro-500">Sem mensagens.</p>
  return (
    <ol className="space-y-3" aria-label="Mensagens do chamado">
      {mensagens.map((m) => {
        const minha = visaoSuporte ? m.do_suporte : !m.do_suporte
        return (
          <li key={m.id} className={cn('flex', minha ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm', m.do_suporte ? 'bg-mata-50 text-mata-900' : 'bg-white text-barro-900 shadow-sm')}>
              <p className="mb-1 text-xs font-semibold text-barro-500">
                {m.do_suporte ? 'Suporte Tanguá App' : visaoSuporte ? 'Usuário' : 'Você'} · {new Date(m.criado_em).toLocaleString('pt-BR')}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.corpo}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
