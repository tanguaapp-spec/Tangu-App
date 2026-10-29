'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Megaphone, MessageCircle, Share2, Store } from 'lucide-react'
import { BottomSheet } from '@/components/ui/bottom-sheet'

const CHAVE_PAGINAS = 'tangua-paginas-vistas'
const CHAVE_PROXIMO = 'tangua-divulgar-proximo-em'
const CHAVE_DIAS = 'tangua-dias-de-uso'
const PRIMEIRA_VEZ_APOS = 4 // telas vistas na primeira visita
const INTERVALO_DIAS = 15

function ler(k: string) {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function gravar(k: string, v: string) {
  try {
    localStorage.setItem(k, v)
  } catch {}
}

/** endereço fixo do app (igual no servidor e no navegador: sem diferença na hidratação) */
function site() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tangua-app.vercel.app').replace(/\/+$/, '')
}

export const TEXTO_AMIGOS = () =>
  `Conhece o Tanguá App? Tem todos os comércios e profissionais de Tanguá, com ofertas, horário e WhatsApp direto. É grátis: ${site()}/?origem=indicacao`
export const TEXTO_PROFISSIONAL = () =>
  `Vi que seu negócio ainda não está no Tanguá App, o app onde o pessoal de Tanguá procura loja e profissional. O perfil é grátis e fica pronto em 5 minutos: ${site()}/cadastrar?papel=profissional&origem=indicacao`

/** Botões de compartilhar (usados no convite e no "não achou?" da busca). */
export function BotoesDivulgar({ compacto = false }: { compacto?: boolean }) {
  return (
    <div className={compacto ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(TEXTO_AMIGOS())}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#1F8A4C] px-4 font-bold text-white"
      >
        <MessageCircle className="h-5 w-5" aria-hidden="true" /> Mandar para amigos no WhatsApp
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(TEXTO_PROFISSIONAL())}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-serra px-4 font-bold text-serra"
      >
        <Store className="h-5 w-5" aria-hidden="true" /> Indicar um profissional ou comércio
      </a>
      {!compacto && (
        <button
          type="button"
          onClick={() => {
            if (navigator.share) navigator.share({ title: 'Tanguá App', text: TEXTO_AMIGOS() }).catch(() => undefined)
            else navigator.clipboard?.writeText(TEXTO_AMIGOS()).catch(() => undefined)
          }}
          className="flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-barro-700"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" /> Compartilhar de outro jeito
        </button>
      )}
    </div>
  )
}

/**
 * "Ajude o Tanguá App a alcançar toda a cidade". Aparece na primeira visita
 * depois de algumas telas (nunca junto com o convite de instalar) e, depois,
 * a cada ~15 dias de uso. "Agora não" adia; compartilhar adia mais.
 */
export function ConviteDivulgar() {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/entrar') || pathname.startsWith('/cadastrar') || pathname.startsWith('/painel')) return
    const vistas = Number(ler(CHAVE_PAGINAS) ?? 0) + 1
    gravar(CHAVE_PAGINAS, String(vistas))
    const proximo = Number(ler(CHAVE_PROXIMO) ?? 0)
    const dias = Number(ler(CHAVE_DIAS) ?? 1)
    const primeiraVez = !ler(CHAVE_PROXIMO) && vistas >= PRIMEIRA_VEZ_APOS
    const deNovo = proximo > 0 && Date.now() >= proximo && dias >= 2
    if (!primeiraVez && !deNovo) return
    // espera um pouco e só abre se nada mais estiver aberto (convite de instalar, recorte, etc.)
    const t = setTimeout(() => {
      if (document.body.style.overflow === 'hidden' || document.querySelector('[role="dialog"]')) return
      setAberto(true)
      gravar(CHAVE_PROXIMO, String(Date.now() + INTERVALO_DIAS * 86400e3))
    }, 3500)
    return () => clearTimeout(t)
  }, [pathname])

  return (
    <BottomSheet aberto={aberto} onFechar={() => setAberto(false)} titulo="Ajude o Tanguá App a chegar em toda a cidade">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-laranja text-tinta">
            <Megaphone className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5 text-[15px] text-barro-800">
            <p>Não achou o profissional que procurava? Conhece comércios e profissionais que ainda não estão aqui?</p>
            <p>
              Compartilhe o app com eles e com seus amigos. Quanto mais gente da cidade estiver no Tanguá App, mais fácil fica achar tudo, e melhor a
              gente atende vocês.
            </p>
          </div>
        </div>
        <BotoesDivulgar />
        <button type="button" onClick={() => setAberto(false)} className="min-h-11 text-sm font-semibold text-barro-600">
          Agora não
        </button>
      </div>
    </BottomSheet>
  )
}
