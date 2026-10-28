'use client'

import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LocateFixed, Loader2 } from 'lucide-react'
import type { Map as MapaLeaflet, CircleMarker } from 'leaflet'

export type PontoMapa = { id: string; nome: string; slug: string; lat: number; lng: number; categoria: string | null; aberto: boolean | null }

const CENTRO: [number, number] = [-22.7423, -42.7202]

function distanciaKm(a: [number, number], b: [number, number]) {
  const r = (g: number) => (g * Math.PI) / 180
  const dLat = r(b[0] - a[0])
  const dLng = r(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

/** Mapa (OpenStreetMap) com os comércios e "perto de mim" pela localização do aparelho. */
export function MapaNegocios({ pontos }: { pontos: PontoMapa[] }) {
  const caixa = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaLeaflet | null>(null)
  const marcadores = useRef(new Map<string, CircleMarker>())
  const [eu, setEu] = useState<[number, number] | null>(null)
  const [localizando, setLocalizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    import('leaflet').then((L) => {
      if (cancelado || !caixa.current || mapa.current) return
      const m = L.map(caixa.current, { zoomControl: true, attributionControl: true }).setView(CENTRO, 14)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(m)
      for (const p of pontos) {
        const cor = p.aberto ? '#0E4D3A' : '#F26A1B'
        const mk = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#ffffff', weight: 2, fillColor: cor, fillOpacity: 1 }).addTo(m)
        const div = document.createElement('div')
        const titulo = document.createElement('b')
        titulo.textContent = p.nome
        const sub = document.createElement('div')
        sub.textContent = [p.categoria, p.aberto === true ? 'Aberto agora' : p.aberto === false ? 'Fechado agora' : null].filter(Boolean).join(' · ')
        sub.style.fontSize = '12px'
        const link = document.createElement('a')
        link.href = `/negocio/${p.slug}?origem=mapa`
        link.textContent = 'Ver perfil'
        link.style.fontWeight = '700'
        div.append(titulo, sub, link)
        mk.bindPopup(div)
        marcadores.current.set(p.id, mk)
      }
      mapa.current = m
    })
    return () => {
      cancelado = true
      mapa.current?.remove()
      mapa.current = null
      marcadores.current.clear()
    }
  }, [pontos])

  function pertoDeMim() {
    if (!navigator.geolocation) {
      setErro('Seu navegador não informa a localização.')
      return
    }
    setLocalizando(true)
    setErro(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const pto: [number, number] = [pos.coords.latitude, pos.coords.longitude]
        setEu(pto)
        setLocalizando(false)
        const L = await import('leaflet')
        if (mapa.current) {
          mapa.current.setView(pto, 16)
          L.circleMarker(pto, { radius: 8, color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(mapa.current).bindTooltip('Você está aqui')
        }
      },
      () => {
        setLocalizando(false)
        setErro('Não deu para pegar sua localização. Libere a localização para este site nas configurações do navegador.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const proximos = eu ? [...pontos].map((p) => ({ ...p, km: distanciaKm(eu, [p.lat, p.lng]) })).sort((a, b) => a.km - b.km).slice(0, 12) : []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pertoDeMim}
          disabled={localizando}
          className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-serra px-4 font-bold text-white disabled:opacity-70"
        >
          {localizando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}
          {localizando ? 'Procurando você…' : 'Perto de mim'}
        </button>
        <span className="flex items-center gap-3 text-sm text-barro-600">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-serra" aria-hidden="true" /> aberto agora
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-laranja" aria-hidden="true" /> fechado ou sem horário
          </span>
        </span>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-700">
          {erro}
        </p>
      )}
      <div ref={caixa} className="z-0 h-[60vh] min-h-[320px] w-full overflow-hidden rounded-[22px] border border-barro-200/80" aria-label="Mapa dos comércios de Tanguá" role="application" />
      {proximos.length > 0 && (
        <section aria-label="Mais perto de você" className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold text-barro-900">Mais perto de você</h2>
          <ul className="flex flex-col divide-y divide-barro-100 rounded-[20px] border border-barro-200/80 bg-superficie">
            {proximos.map((p) => (
              <li key={p.id}>
                <Link href={`/negocio/${p.slug}?origem=mapa`} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-barro-900">{p.nome}</b>
                    <span className="text-sm text-barro-600">{p.categoria}</span>
                  </span>
                  <span className="shrink-0 font-mono text-sm text-barro-700">{p.km < 1 ? `${Math.round(p.km * 1000)} m` : `${p.km.toFixed(1).replace('.', ',')} km`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
