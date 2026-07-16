import Link from 'next/link'
import Image from 'next/image'
import { MapPin, MessageCircle, Star, Store } from 'lucide-react'
import type { Negocio } from '@/lib/types/database'
import { Selo, SeloVerificado } from '@/components/ui/selo'
import { linkWhatsapp } from '@/lib/utils'

export function CardNegocio({ negocio }: { negocio: Negocio }) {
  return (
    <div className="group relative overflow-hidden rounded-casca border border-barro-100 bg-white shadow-feira transition-all hover:-translate-y-1 hover:shadow-feira-lg">
      {negocio.destaque_ativo && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-casca-500 px-2.5 py-1 text-xs font-bold text-white">
          Destaque
        </span>
      )}

      <Link href={`/negocio/${negocio.id}`}>
        <div className="relative h-40 w-full bg-barro-100">
          {negocio.foto_capa_url ? (
            <Image
              src={negocio.foto_capa_url}
              alt={negocio.nome}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-barro-300">
              <Store className="h-10 w-10" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/negocio/${negocio.id}`}>
            <h3 className="font-display text-lg font-semibold text-barro-900 hover:text-casca-600">
              {negocio.nome}
            </h3>
          </Link>
          {negocio.verificado && <SeloVerificado />}
        </div>

        {negocio.categoria && (
          <Selo tom="neutro" className="mt-1.5">
            {negocio.categoria.nome}
          </Selo>
        )}

        <div className="mt-3 flex flex-col gap-1.5 text-sm text-barro-600">
          {negocio.bairro && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-barro-400" />
              {negocio.bairro}
            </span>
          )}
          {negocio.nota_google && (
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 fill-casca-400 text-casca-400" />
              {negocio.nota_google.toFixed(1)}
              {negocio.total_avaliacoes_google ? ` (${negocio.total_avaliacoes_google})` : ''}
            </span>
          )}
        </div>

        {negocio.whatsapp && (
          <a
            href={linkWhatsapp(negocio.whatsapp, `Olá! Vi seu perfil no Tanguá App.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-mata-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-mata-600"
          >
            <MessageCircle className="h-4 w-4" />
            Chamar no WhatsApp
          </a>
        )}
      </div>
    </div>
  )
}
