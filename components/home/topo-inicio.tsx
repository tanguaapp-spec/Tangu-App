'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { MarcaTangua } from '@/components/marca/logo-tangua'
import { BotaoSino } from '@/components/layout/botao-sino'
import { useSessao } from '@/components/layout/sessao'

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  if (hora < 5) return 'Boa noite'
  if (hora < 12) return 'Bom dia'
  if (hora < 18) return 'Boa tarde'
  return 'Boa noite'
}

/** Topo verde da aba Início no celular (protótipo "Início — mobile"). */
export function TopoInicio() {
  const { primeiroNome } = useSessao()
  // a página fica em cache: a saudação depende do relógio de quem abre
  const [ola, setOla] = useState<string | null>(null)
  useEffect(() => setOla(saudacao()), [])

  return (
    <header className="flex flex-col gap-3.5 rounded-b-[28px] bg-serra px-5 pb-6 pt-[max(18px,env(safe-area-inset-top))] text-white md:hidden">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-white">
          <MarcaTangua variante="sobre-escuro" tamanho="sm" />
          <span className="sr-only">Tanguá App</span>
        </Link>
        <BotaoSino sobreVerde />
      </div>
      <div>
        <p className="min-h-[20px] text-sm text-white/75">
          {ola ? `${ola}${primeiroNome ? `, ${primeiroNome}` : ''}` : ''} · Tanguá
        </p>
        <h1 className="mt-0.5 font-display text-[26px] font-bold leading-[1.15]">O que você procura hoje?</h1>
      </div>
      <form action="/buscar" method="get" role="search">
        <label className="flex h-[50px] items-center gap-2.5 rounded-2xl bg-white px-3.5">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#55655D]" aria-hidden="true" />
          <input
            name="q"
            type="search"
            enterKeyHint="search"
            placeholder="Pizza, eletricista, farmácia…"
            aria-label="Buscar em Tanguá"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-[#13241D] placeholder:text-[#6B7A72] focus:outline-none"
          />
        </label>
      </form>
    </header>
  )
}
