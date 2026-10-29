import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { createServiceClient } from '@/lib/supabase/server'
import { urlDoSite } from '@/lib/site'
import { LogoTangua } from '@/components/marca/logo-tangua'
import { BotaoImprimir } from '@/components/painel/botao-imprimir'

export const metadata: Metadata = { title: 'Cartaz da campanha', robots: { index: false } }
export const dynamic = 'force-dynamic'

/**
 * "Seu comércio já está no Tanguá App": cartaz A4 para entregar no balcão de
 * quem ainda não assumiu o perfil. O QR leva direto ao "Sou o dono".
 */
export default async function CartazCampanha({ searchParams }: { searchParams: { negocio?: string } }) {
  const id = searchParams.negocio ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data: n } = await createServiceClient().from('negocios').select('nome, slug').eq('id', id).maybeSingle()
  if (!n) notFound()
  const url = `${urlDoSite()}/negocio/${n.slug ?? id}?origem=campanha#reivindicar`
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#0E4D3A', light: '#FFFFFF' } })
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="print:hidden">
        <BotaoImprimir />
      </div>
      <article
        className="flex aspect-[210/297] w-full max-w-[560px] flex-col items-center justify-between rounded-[24px] bg-white p-[6%] text-center text-[#13241D] shadow-feira print:max-w-none print:rounded-none print:shadow-none"
        style={{ colorScheme: 'light' }}
      >
        <div className="flex items-center gap-2 text-[#0E4D3A]">
          <LogoTangua variante="cor" className="h-10 w-10" />
          <span className="font-display text-3xl font-bold">tanguá</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg">Seu comércio já está no Tanguá App</p>
          <p className="font-display text-[clamp(22px,5vw,36px)] font-bold leading-tight">{n.nome}</p>
        </div>
        <div className="w-[52%] rounded-[20px] border-[6px] border-[#F26A1B] bg-white p-[4%] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-bold">Aponte a câmera e assuma seu perfil grátis</p>
          <p className="text-base text-[#3B4A43]">Coloque fotos, preços e ofertas. Os clientes de Tanguá chamam você direto no WhatsApp.</p>
        </div>
        <p className="font-mono text-xs text-[#55655D]">tanguá app · o guia da cidade</p>
      </article>
    </div>
  )
}
