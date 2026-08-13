import Link from 'next/link'
import { Calendar, Megaphone, MapPin, Search, PartyPopper, HelpCircle, Store } from 'lucide-react'
import type { AvisoCidade } from '@/lib/types/database'
import { Selo } from '@/components/ui/selo'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ReacoesAviso } from '@/components/mural/reacoes-aviso'
import { FormularioResponderPergunta } from '@/components/mural/formulario-responder-pergunta'

const iconesPorTipo = {
  aviso: Megaphone,
  evento: PartyPopper,
  utilidade_publica: MapPin,
  achados_perdidos: Search,
  pergunta: HelpCircle,
}

const rotulosPorTipo = {
  aviso: 'Aviso',
  evento: 'Evento',
  utilidade_publica: 'Utilidade pública',
  achados_perdidos: 'Achados e perdidos',
  pergunta: 'Pergunta pra cidade',
}

interface Props {
  aviso: AvisoCidade
  indice?: number
  contagensReacao?: Record<string, number>
  minhaReacao?: string
  logado?: boolean
  respostas?: { id: string; negocio?: { id: string; nome: string } }[]
}

export function CardAviso({ aviso, indice = 0, contagensReacao = {}, minhaReacao, logado = false, respostas = [] }: Props) {
  const Icone = iconesPorTipo[aviso.tipo]

  return (
    <div
      className="entrada-lista rounded-casca border border-barro-100 bg-white p-5 shadow-feira transition-all duration-300 hover:-translate-y-1 hover:shadow-feira-lg"
      style={{ '--i': Math.min(indice, 8) } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <Selo tom={aviso.tipo === 'evento' ? 'laranja' : aviso.tipo === 'pergunta' ? 'verde' : 'neutro'}>
          <Icone className="h-3.5 w-3.5" />
          {rotulosPorTipo[aviso.tipo]}
        </Selo>
        {aviso.fixado && <Selo tom="aviso">Fixado</Selo>}
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-barro-900">{aviso.titulo}</h3>
      {aviso.conteudo && <p className="mt-1.5 text-sm text-barro-700">{aviso.conteudo}</p>}

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-barro-500">
        {aviso.data_evento && (
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {format(new Date(aviso.data_evento), "dd 'de' MMMM, HH:mm", { locale: ptBR })}
          </span>
        )}
        {aviso.local_evento && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {aviso.local_evento}
          </span>
        )}
        {aviso.bairro && aviso.tipo === 'pergunta' && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {aviso.bairro}
          </span>
        )}
      </div>

      {aviso.tipo === 'pergunta' && (
        <div className="mt-3 border-t border-barro-100 pt-3">
          {respostas.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {respostas.map(
                (r) =>
                  r.negocio && (
                    <Link
                      key={r.id}
                      href={`/negocio/${r.negocio.id}`}
                      className="flex items-center gap-1.5 text-sm font-medium text-mata-700 hover:underline"
                    >
                      <Store className="h-3.5 w-3.5" /> {r.negocio.nome}
                    </Link>
                  )
              )}
            </div>
          )}
          <FormularioResponderPergunta avisoId={aviso.id} logado={logado} />
        </div>
      )}

      <ReacoesAviso avisoId={aviso.id} contagens={contagensReacao} minhaReacao={minhaReacao} logado={logado} />
    </div>
  )
}
