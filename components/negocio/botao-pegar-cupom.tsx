'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { Ticket } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { resgatarCupom } from '@/lib/actions/negocio-actions'

export function BotaoPegarCupom({
  cupomId,
  logado,
  codigoInicial,
  esgotado,
}: {
  cupomId: string
  logado: boolean
  codigoInicial: string | null
  esgotado: boolean
}) {
  const [codigo, setCodigo] = useState<string | null>(codigoInicial)
  const [qr, setQr] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!codigo) return
    QRCode.toDataURL(codigo, { margin: 1, width: 160 }).then(setQr).catch(() => setQr(null))
  }, [codigo])

  if (codigo) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-superficie p-3" role="status">
        {/* data: URL gerada no navegador — next/image não otimiza isso */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {qr && <img src={qr} alt={`QR do cupom ${codigo}`} width={96} height={96} className="rounded" />}
        <div>
          <p className="text-xs text-barro-500">Seu código</p>
          <p className="font-mono text-2xl font-bold tracking-widest text-barro-900">{codigo}</p>
          <p className="text-xs text-barro-500">Mostre no balcão. Vale uma vez.</p>
        </div>
      </div>
    )
  }

  if (esgotado) return <p className="text-sm font-medium text-barro-600">Cupons esgotados.</p>

  if (!logado) {
    return (
      <Link href="/entrar" className="inline-flex items-center gap-2 text-sm font-semibold text-casca-800 underline">
        <Ticket className="h-4 w-4" aria-hidden="true" /> Entre pra pegar seu cupom
      </Link>
    )
  }

  return (
    <div>
      <Botao
        tamanho="sm"
        carregando={carregando}
        onClick={async () => {
          setCarregando(true)
          setErro(null)
          const r = await resgatarCupom(cupomId)
          setCarregando(false)
          if (r.erro) setErro(r.erro)
          else setCodigo(r.codigo)
        }}
      >
        <Ticket className="h-4 w-4" aria-hidden="true" /> Pegar meu cupom
      </Botao>
      {erro && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {erro}
        </p>
      )}
    </div>
  )
}
