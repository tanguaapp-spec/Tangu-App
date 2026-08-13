import QRCode from 'qrcode'
import { Share2, Download } from 'lucide-react'
import { BotaoCopiarLink } from '@/components/painel/botao-copiar-link'
import { BotaoCompartilhar } from '@/components/ui/botao-compartilhar'

export async function CartaoDivulgacao({ urlPublica, nomeNegocio }: { urlPublica: string; nomeNegocio: string }) {
  const qrCodeDataUrl = await QRCode.toDataURL(urlPublica, {
    margin: 1,
    width: 220,
    color: { dark: '#7c2d12', light: '#ffffff' },
  })

  const mensagemCompartilhamento = `Conheça o ${nomeNegocio} no Tanguá App! ${urlPublica}`

  return (
    <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-barro-900">
        <Share2 className="h-5 w-5 text-casca-500" />
        Divulgue seu negócio
      </h2>
      <p className="mt-1 text-sm text-barro-600">
        Use o link ou o QR code no seu Instagram, status do WhatsApp, cartão de visita ou vitrine.
      </p>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrCodeDataUrl}
          alt={`QR code do perfil de ${nomeNegocio}`}
          width={140}
          height={140}
          className="rounded-xl border border-barro-100"
        />

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="rounded-lg bg-barro-50 px-3 py-2 text-sm text-barro-700 break-all">{urlPublica}</div>

          <div className="flex flex-wrap gap-2">
            <BotaoCompartilhar
              titulo={nomeNegocio}
              texto={mensagemCompartilhamento}
              url={urlPublica}
              rotulo="Compartilhar"
              className="border border-barro-300 bg-transparent px-3 py-1.5 text-sm text-barro-800 hover:bg-barro-100"
            />
            <BotaoCopiarLink texto={urlPublica} />
            <a href={qrCodeDataUrl} download={`qrcode-${nomeNegocio.replace(/\s+/g, '-').toLowerCase()}.png`}>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-barro-300 bg-transparent px-3 py-1.5 text-sm font-semibold text-barro-800 transition-colors hover:bg-barro-100"
              >
                <Download className="h-4 w-4" />
                Baixar QR code
              </button>
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(mensagemCompartilhamento)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
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
    </div>
  )
}
