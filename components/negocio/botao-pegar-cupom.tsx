'use client'

import { chamarAcao } from '@/lib/ui/chamar-acao'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Loader2 } from 'lucide-react'
import { resgatarCupom } from '@/lib/actions/negocio-actions'
import { vibrar } from '@/lib/ui/vibrar'

export function BotaoPegarCupom({
  cupomId,
  logado,
  codigoInicial,
  esgotado,
  voltarPara,
}: {
  cupomId: string
  logado: boolean
  codigoInicial: string | null
  esgotado: boolean
  /** caminho do perfil, pra voltar depois de entrar */
  voltarPara?: string
}) {
  const [codigo, setCodigo] = useState<string | null>(codigoInicial)
  const [qr, setQr] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!codigo) return
    QRCode.toDataURL(codigo, { margin: 1, width: 192 }).then(setQr).catch(() => setQr(null))
  }, [codigo])

  if (codigo) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-[14px] bg-superficie p-3">
        {/* data: URL gerada no navegador — next/image não otimiza isso */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr ? <img src={qr} alt={`QR do cupom ${codigo}`} width={64} height={64} className="h-16 w-16 rounded-lg bg-white" /> : <span className="h-16 w-16 rounded-lg bg-barro-100" />}
        <span>
          <span className="block text-xs text-barro-600">Seu código</span>
          <span className="block font-mono text-[22px] font-bold tracking-[0.08em] text-barro-900">{codigo}</span>
          <span className="block text-xs text-barro-600">Mostre no balcão. Vale uma vez.</span>
        </span>
      </div>
    )
  }

  if (esgotado) return <p className="rounded-[14px] bg-superficie p-3 text-center text-sm font-semibold text-barro-700">Os cupons dessa oferta acabaram.</p>

  if (!logado) {
    return (
      <Link
        href={`/entrar?next=${encodeURIComponent(`${voltarPara ?? '/ofertas'}#oferta`)}`}
        className="flex h-12 items-center justify-center rounded-[14px] bg-laranja font-bold text-tinta"
      >
        Entrar e pegar meu cupom
      </Link>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={carregando}
        onClick={async () => {
          setCarregando(true)
          setErro(null)
          const r = await chamarAcao(resgatarCupom(cupomId))
          setCarregando(false)
          if (r.erro) setErro(r.erro)
          else {
            vibrar([12, 40, 12])
            setCodigo(r.codigo)
          }
        }}
        className="flex h-12 items-center justify-center gap-2 rounded-[14px] bg-laranja text-base font-bold text-tinta transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Pegar meu cupom
      </button>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}
