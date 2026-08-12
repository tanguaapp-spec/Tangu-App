import { Briefcase, MapPin, Wallet } from 'lucide-react'
import type { Vaga } from '@/lib/types/database'
import { Selo } from '@/components/ui/selo'
import { linkWhatsapp } from '@/lib/utils'
import { Botao } from '@/components/ui/botao'

export function CardVaga({ vaga, indice = 0 }: { vaga: Vaga; indice?: number }) {
  return (
    <div
      className="entrada-lista rounded-casca border border-barro-100 bg-white p-5 shadow-feira transition-all duration-300 hover:-translate-y-1 hover:shadow-feira-lg"
      style={{ '--i': Math.min(indice, 8) } as React.CSSProperties}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-barro-900">{vaga.titulo}</h3>
          <p className="text-sm text-barro-600">{vaga.empresa_nome}</p>
        </div>
        {vaga.tipo_contrato && <Selo tom="verde">{vaga.tipo_contrato}</Selo>}
      </div>

      <p className="mt-3 text-sm text-barro-700 line-clamp-3">{vaga.descricao}</p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-barro-600">
        {vaga.bairro && (
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-barro-400" /> {vaga.bairro}
          </span>
        )}
        {vaga.salario_faixa && (
          <span className="flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-barro-400" /> {vaga.salario_faixa}
          </span>
        )}
        {vaga.area && (
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-barro-400" /> {vaga.area}
          </span>
        )}
      </div>

      {vaga.contato_whatsapp && (
        <a href={linkWhatsapp(vaga.contato_whatsapp, `Olá! Vi a vaga "${vaga.titulo}" no Tanguá App.`)} target="_blank" rel="noopener noreferrer">
          <Botao variante="secundario" className="mt-4 w-full">
            Tenho interesse
          </Botao>
        </a>
      )}
    </div>
  )
}
