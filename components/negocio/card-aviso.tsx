import { Calendar, Megaphone, MapPin, Search, PartyPopper } from 'lucide-react'
import type { AvisoCidade } from '@/lib/types/database'
import { Selo } from '@/components/ui/selo'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const iconesPorTipo = {
  aviso: Megaphone,
  evento: PartyPopper,
  utilidade_publica: MapPin,
  achados_perdidos: Search,
}

const rotulosPorTipo = {
  aviso: 'Aviso',
  evento: 'Evento',
  utilidade_publica: 'Utilidade pública',
  achados_perdidos: 'Achados e perdidos',
}

export function CardAviso({ aviso, indice = 0 }: { aviso: AvisoCidade; indice?: number }) {
  const Icone = iconesPorTipo[aviso.tipo]

  return (
    <div
      className="entrada-lista rounded-casca border border-barro-100 bg-white p-5 shadow-feira transition-all duration-300 hover:-translate-y-1 hover:shadow-feira-lg"
      style={{ '--i': Math.min(indice, 8) } as React.CSSProperties}
    >
      <div className="flex items-center justify-between">
        <Selo tom={aviso.tipo === 'evento' ? 'laranja' : 'neutro'}>
          <Icone className="h-3.5 w-3.5" />
          {rotulosPorTipo[aviso.tipo]}
        </Selo>
        {aviso.fixado && <Selo tom="aviso">Fixado</Selo>}
      </div>

      <h3 className="mt-3 font-display text-lg font-semibold text-barro-900">{aviso.titulo}</h3>
      <p className="mt-1.5 text-sm text-barro-700">{aviso.conteudo}</p>

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
      </div>
    </div>
  )
}
