'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export type BannerNoAr = { id: string; arte_url: string; link_destino: string | null; nome_negocio: string | null; slug: string | null }

function contar(id: string, tipo: 'impressao' | 'clique') {
  const corpo = JSON.stringify({ id, tipo })
  if (tipo === 'clique' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/divulgacao/contar', new Blob([corpo], { type: 'application/json' }))
    return
  }
  fetch('/api/divulgacao/contar', { method: 'POST', body: corpo, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => undefined)
}

/** Banner comprado no painel. Troca a cada 6 s quando há mais de um; conta visualização uma vez por sessão. */
export function BannerPago({ banners, className }: { banners: BannerNoAr[]; className?: string }) {
  const [i, setI] = useState(0)
  const atual = banners[i % banners.length]

  useEffect(() => {
    if (banners.length < 2) return
    const t = setInterval(() => setI((n) => n + 1), 6000)
    return () => clearInterval(t)
  }, [banners.length])

  useEffect(() => {
    if (!atual) return
    const chave = `tangua-banner-visto-${atual.id}`
    try {
      if (sessionStorage.getItem(chave)) return
      sessionStorage.setItem(chave, '1')
    } catch {}
    contar(atual.id, 'impressao')
  }, [atual])

  if (!atual) return null
  const destino = atual.link_destino || (atual.slug ? `/negocio/${atual.slug}?origem=banner` : null)
  const externo = !!destino && /^https?:\/\//.test(destino)
  const imagem = (
    // arte vem do storage do Supabase já otimizada; proporção livre (sugestão 3:1)
    // eslint-disable-next-line @next/next/no-img-element
    <img src={atual.arte_url} alt={atual.nome_negocio ? `Anúncio: ${atual.nome_negocio}` : 'Anúncio'} className="block h-auto w-full rounded-[20px] object-cover" loading="lazy" />
  )
  return (
    <aside aria-label="Publicidade" className={className}>
      <div className="relative">
        {destino ? (
          externo ? (
            <a href={destino} target="_blank" rel="noopener noreferrer sponsored" onClick={() => contar(atual.id, 'clique')}>
              {imagem}
            </a>
          ) : (
            <Link href={destino} onClick={() => contar(atual.id, 'clique')}>
              {imagem}
            </Link>
          )
        ) : (
          imagem
        )}
        <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">Publicidade</span>
      </div>
      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {banners.map((b, n) => (
            <span key={b.id} className={`h-1.5 rounded-full transition-all ${n === i % banners.length ? 'w-5 bg-casca-500' : 'w-1.5 bg-barro-300'}`} />
          ))}
        </div>
      )}
    </aside>
  )
}
