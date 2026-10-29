import type { Metadata } from 'next'
import QRCode from 'qrcode'
import { exigirNegocio } from '@/lib/painel/negocio-atual'
import { urlDoSite } from '@/lib/site'
import { urlNegocio } from '@/lib/ui/apresentacao'
import { LogoTangua } from '@/components/marca/logo-tangua'
import { BotaoImprimir } from '@/components/painel/botao-imprimir'

export const metadata: Metadata = { title: 'Cartaz do negócio', robots: { index: false } }
export const dynamic = 'force-dynamic'

/** A4 pra imprimir: cores fixas (não segue o tema), sem menus na impressão. */
export default async function PaginaCartaz({ searchParams }: { searchParams: { tipo?: string } }) {
  const avaliar = searchParams.tipo === 'avaliar'
  const { negocio } = await exigirNegocio('/painel/negocio/divulgar/cartaz')
  const url = `${urlDoSite()}${urlNegocio(negocio)}?origem=qr${avaliar ? '#avaliar' : ''}`
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#0E4D3A', light: '#FFFFFF' } })
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <a href="/painel/negocio/divulgar/cartaz" className={`inline-flex h-12 items-center rounded-[14px] px-4 font-semibold ${!avaliar ? 'bg-serra text-white' : 'border border-barro-200'}`}>
          Cartaz “favorite”
        </a>
        <a href="/painel/negocio/divulgar/cartaz?tipo=avaliar" className={`inline-flex h-12 items-center rounded-[14px] px-4 font-semibold ${avaliar ? 'bg-serra text-white' : 'border border-barro-200'}`}>
          Cartaz “avalie a gente”
        </a>
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
          <p className="font-display text-[clamp(22px,5vw,36px)] font-bold leading-tight">{negocio.nome}</p>
          <p className="text-lg">está no Tanguá App</p>
        </div>
        <div className="w-[58%] rounded-[20px] [&>svg]:h-auto [&>svg]:w-full border-[6px] border-[#F26A1B] bg-white p-[4%]" dangerouslySetInnerHTML={{ __html: qr }} />
        <div className="flex flex-col gap-1">
          <p className="font-display text-xl font-bold">{avaliar ? 'Gostou? Avalie a gente!' : 'Aponte a câmera e favorite'}</p>
          <p className="text-base text-[#3B4A43]">
            {avaliar ? 'Aponte a câmera e deixe sua nota. Leva 30 segundos e ajuda muito a gente.' : 'Receba nossas ofertas e fale com a gente direto no WhatsApp.'}
          </p>
        </div>
        <p className="font-mono text-xs text-[#55655D]">{url.replace(/^https?:\/\//, '').replace(/\?origem=qr.*$/, '')}</p>
      </article>
    </div>
  )
}
