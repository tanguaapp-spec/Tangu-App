'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Minus, Plus, X } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { cn } from '@/lib/utils'

export type Previa = {
  rotulo: string
  /** largura ÷ altura do lugar onde a foto aparece */
  proporcao: number
  /** largura da prévia em px (a altura sai da proporção) */
  largura: number
  redonda?: boolean
}

const LARGURA_SAIDA = 1600

/**
 * Recorte de foto antes de enviar: arraste para enquadrar, zoom pelo
 * controle, e veja como fica em cada lugar do app. Devolve um JPEG já no
 * tamanho certo (leve pra subir até no 4G).
 */
export function RecortarFoto({
  arquivo,
  proporcao,
  previas = [],
  titulo = 'Ajustar foto',
  aoConfirmar,
  aoCancelar,
}: {
  arquivo: File
  proporcao: number
  previas?: Previa[]
  titulo?: string
  aoConfirmar: (foto: File, url: string) => void
  aoCancelar: () => void
}) {
  const [url] = useState(() => URL.createObjectURL(arquivo))
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [quadro, setQuadro] = useState({ w: 320, h: 320 / proporcao })
  const caixa = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  useEffect(() => {
    const i = new Image()
    i.onload = () => setImg(i)
    i.src = url
  }, [url])

  // quadro ocupa a largura disponível
  useEffect(() => {
    const medir = () => {
      const w = Math.min(caixa.current?.clientWidth ?? 320, 560)
      setQuadro({ w, h: w / proporcao })
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [proporcao, montado])

  const base = img ? Math.max(quadro.w / img.naturalWidth, quadro.h / img.naturalHeight) : 1
  const escala = base * zoom
  const largura = img ? img.naturalWidth * escala : quadro.w
  const altura = img ? img.naturalHeight * escala : quadro.h
  const limitar = (x: number, y: number) => ({
    x: Math.min(0, Math.max(quadro.w - largura, x)),
    y: Math.min(0, Math.max(quadro.h - altura, y)),
  })

  // centraliza ao abrir e mantém dentro do quadro quando o zoom muda
  useEffect(() => {
    if (!img) return
    setPos((p) => (p.x === 0 && p.y === 0 && zoom === 1 ? limitar((quadro.w - largura) / 2, (quadro.h - altura) / 2) : limitar(p.x, p.y)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, zoom, quadro.w, quadro.h])

  function confirmar() {
    if (!img) return
    const canvas = document.createElement('canvas')
    canvas.width = LARGURA_SAIDA
    canvas.height = Math.round(LARGURA_SAIDA / proporcao)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(img, -pos.x / escala, -pos.y / escala, quadro.w / escala, quadro.h / escala, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const nome = arquivo.name.replace(/\.\w+$/, '') + '.jpg'
        aoConfirmar(new File([blob], nome, { type: 'image/jpeg', lastModified: Date.now() }), canvas.toDataURL('image/jpeg', 0.7))
      },
      'image/jpeg',
      0.86
    )
  }

  if (!montado) return null
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={titulo} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 sm:items-center">
      <div className="flex max-h-[95vh] w-full max-w-[620px] flex-col gap-4 overflow-y-auto rounded-t-[24px] bg-superficie p-4 sm:rounded-[24px] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold text-barro-900">{titulo}</h2>
          <button type="button" onClick={aoCancelar} aria-label="Cancelar" className="flex h-11 w-11 items-center justify-center rounded-xl text-barro-700 hover:bg-barro-100">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div ref={caixa} className="w-full">
          <div
            className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-barro-900"
            style={{ width: quadro.w, height: quadro.h, cursor: 'grab' }}
            onPointerDown={(e) => {
              ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
              arrasto.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
            }}
            onPointerMove={(e) => {
              const a = arrasto.current
              if (!a) return
              setPos(limitar(a.px + e.clientX - a.x, a.py + e.clientY - a.y))
            }}
            onPointerUp={() => (arrasto.current = null)}
            onPointerCancel={() => (arrasto.current = null)}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none"
                style={{ width: largura, height: altura, transform: `translate(${pos.x}px, ${pos.y}px)` }}
              />
            )}
          </div>
          <p className="mt-2 text-center text-xs text-barro-600">Arraste a foto para enquadrar.</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Diminuir zoom" onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-barro-200">
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" className="h-11 min-w-0 flex-1 accent-[#F26A1B]" />
          <button type="button" aria-label="Aumentar zoom" onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-barro-200">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {previas.length > 0 && img && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-barro-800">Como vai aparecer</p>
            <div className="flex flex-wrap items-end gap-4">
              {previas.map((p) => (
                <figure key={p.rotulo} className="flex flex-col gap-1">
                  <div
                    className={cn('relative overflow-hidden bg-barro-100', p.redonda ? 'rounded-full' : 'rounded-xl')}
                    style={{ width: p.largura, height: Math.round(p.largura / p.proporcao) }}
                  >
                    <PreviaRecorte url={url} img={img} quadro={quadro} pos={pos} escala={escala} destino={{ w: p.largura, h: p.largura / p.proporcao }} />
                  </div>
                  <figcaption className="text-xs text-barro-600">{p.rotulo}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Botao type="button" onClick={confirmar} disabled={!img} className="sm:flex-1">
            Usar esta foto
          </Botao>
          <Botao type="button" variante="fantasma" onClick={aoCancelar} className="sm:flex-1">
            Cancelar
          </Botao>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Mostra o recorte escolhido como ele fica num lugar de outra proporção (o app usa "cobrir", centralizado). */
function PreviaRecorte({
  url,
  img,
  quadro,
  pos,
  escala,
  destino,
}: {
  url: string
  img: HTMLImageElement
  quadro: { w: number; h: number }
  pos: { x: number; y: number }
  escala: number
  destino: { w: number; h: number }
}) {
  // área recortada (em pixels da foto original)
  const sx = -pos.x / escala
  const sy = -pos.y / escala
  const sw = quadro.w / escala
  const sh = quadro.h / escala
  // o recorte é exibido com object-cover no destino
  const k = Math.max(destino.w / sw, destino.h / sh)
  const offX = (destino.w - sw * k) / 2 - sx * k
  const offY = (destino.h - sh * k) / 2 - sy * k
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      draggable={false}
      className="pointer-events-none absolute left-0 top-0 max-w-none"
      style={{ width: img.naturalWidth * k, height: img.naturalHeight * k, transform: `translate(${offX}px, ${offY}px)` }}
    />
  )
}
