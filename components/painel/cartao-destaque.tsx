import { Sparkles } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { linkWhatsapp } from '@/lib/utils'

const WHATSAPP_CONTATO = '21972652314'

export function CartaoDestaque({
  negocioId,
  nomeNegocio,
  destaqueAtivo,
  destaqueExpiraEm,
}: {
  negocioId: string
  nomeNegocio: string
  destaqueAtivo: boolean
  destaqueExpiraEm: string | null
}) {
  const mensagem = `Olá! Quero colocar o "${nomeNegocio}" em destaque no Tanguá App (id: ${negocioId}).`

  return (
    <div className="mt-8 rounded-casca border border-casca-200 bg-casca-50 p-6 shadow-feira">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-barro-900">
        <Sparkles className="h-5 w-5 text-casca-500" />
        Destaque no diretório
      </h2>

      {destaqueAtivo ? (
        <p className="mt-2 text-sm text-barro-700">
          Seu negócio está em destaque{' '}
          {destaqueExpiraEm && `até ${new Date(destaqueExpiraEm).toLocaleDateString('pt-BR')}`} — aparece primeiro na
          busca e ganha um selo especial no card.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-barro-700">
            Negócios em destaque aparecem primeiro na busca e ganham um selo especial no card. Ativação é manual,
            depois de combinarmos o valor e o prazo direto com você.
          </p>
          <a href={linkWhatsapp(WHATSAPP_CONTATO, mensagem)} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block">
            <Botao tamanho="sm">Quero colocar meu negócio em destaque</Botao>
          </a>
        </>
      )}
    </div>
  )
}
