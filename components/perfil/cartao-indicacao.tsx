import QRCode from 'qrcode'
import { Download, Users } from 'lucide-react'
import { BotaoCopiarLink } from '@/components/painel/botao-copiar-link'
import { urlDoSite } from '@/lib/site'

/**
 * Indicar vizinho: link e QR code. O vizinho aponta a câmera do celular,
 * cai direto no cadastro com o convite preenchido, e o cadastro fica
 * marcado como vindo de QR (aparece no funil do admin).
 */
export async function CartaoIndicacao({ codigoConvite, totalIndicados }: { codigoConvite: string; totalIndicados: number }) {
  const urlConvite = `${urlDoSite()}/cadastrar?convite=${encodeURIComponent(codigoConvite)}`
  const urlQr = `${urlConvite}&origem=qr-indicacao`
  const qr = await QRCode.toDataURL(urlQr, { margin: 1, width: 360, color: { dark: '#0E4D3A', light: '#FFFFFF' } })
  const mensagem = `Entra no Tanguá App! É o app da nossa cidade: comércios, profissionais, ofertas e o que acontece em Tanguá. ${urlConvite}`

  return (
    <section aria-labelledby="t-indicacao" className="rounded-[20px] border border-barro-200/80 bg-superficie p-4">
      <h2 id="t-indicacao" className="flex items-center gap-2.5 font-display text-lg font-bold text-barro-900">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-serra text-white">
          <Users className="h-4 w-4" aria-hidden="true" />
        </span>
        Indique um vizinho
      </h2>
      <p className="mt-1 text-sm text-barro-600">
        Mostre o QR pro vizinho apontar a câmera do celular, ou mande o link.
        {totalIndicados > 0 && (
          <span className="font-semibold text-mata-700">
            {' '}
            Você já trouxe {totalIndicados} {totalIndicados === 1 ? 'vizinho' : 'vizinhos'}.
          </span>
        )}
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        {/* data: URL gerada no servidor — next/image não otimiza isso */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code do seu convite para o Tanguá App" width={200} height={200} className="h-[200px] w-[200px] rounded-2xl border-4 border-laranja bg-white p-1" />
        <p className="text-center text-xs text-barro-600">Abre a câmera, aponta, toca no link que aparecer.</p>
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="break-all rounded-[14px] bg-feira px-3 py-2.5 font-mono text-sm text-barro-800">{urlConvite}</div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-xl bg-serra px-4 text-sm font-bold text-white"
          >
            Mandar no WhatsApp
          </a>
          <BotaoCopiarLink texto={urlConvite} />
          <a
            href={qr}
            download="convite-tangua-app.png"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-barro-200 px-3 text-sm font-semibold text-barro-900"
          >
            <Download className="h-4 w-4" aria-hidden="true" /> Baixar QR
          </a>
        </div>
      </div>
    </section>
  )
}
