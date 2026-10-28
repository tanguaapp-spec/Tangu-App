'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, Heart, ShieldCheck, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarcaTangua } from '@/components/marca/logo-tangua'
import { BotaoSino } from '@/components/layout/botao-sino'
import { useSessao } from '@/components/layout/sessao'

const LINKS = [
  { href: '/', rotulo: 'Início' },
  { href: '/buscar', rotulo: 'Explorar' },
  { href: '/ofertas', rotulo: 'Ofertas' },
  { href: '/agenda', rotulo: 'Agenda' },
  { href: '/vagas', rotulo: 'Vagas' },
  { href: '/mural', rotulo: 'Mural' },
]

// Telas que desenham o próprio topo no celular (como no protótipo).
const TOPO_PROPRIO = [/^\/$/, /^\/buscar/, /^\/negocio\//, /^\/ofertas/, /^\/categoria\//]
// Abas da barra inferior: no celular não mostram "voltar".
const ABAS = ['/orcamentos', '/perfil']

export function Cabecalho() {
  const pathname = usePathname()
  const router = useRouter()
  const sessao = useSessao()
  const topoProprio = TOPO_PROPRIO.some((r) => r.test(pathname))
  const eAba = ABAS.includes(pathname)

  return (
    <>
      {/* computador */}
      <header className="sticky top-0 z-50 hidden border-b border-barro-200/80 bg-superficie md:block">
        <div className="mx-auto flex max-w-[1200px] items-center gap-7 px-6 py-3.5">
          <Link href="/" className="flex min-h-11 items-center text-mata-700">
            <MarcaTangua tamanho="md" />
            <span className="sr-only">Tanguá App — página inicial</span>
          </Link>
          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-x-5 text-[15px] font-semibold">
            {LINKS.map((l) => {
              const ativo = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={ativo ? 'page' : undefined}
                  className={cn(
                    'border-b-2 py-1.5 transition-colors',
                    ativo ? 'border-laranja text-mata-700' : 'border-transparent text-barro-900 hover:text-mata-700'
                  )}
                >
                  {l.rotulo}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-2.5">
            {sessao.logado ? (
              <>
                <Link
                  href="/favoritos"
                  aria-label="Favoritos"
                  className="flex h-11 w-11 items-center justify-center rounded-[14px] text-barro-900 hover:bg-barro-50"
                >
                  <Heart className="h-5 w-5" />
                </Link>
                {sessao.ehAdmin && (
                  <Link
                    href="/painel/admin"
                    className="flex h-11 items-center gap-1.5 rounded-[14px] px-3 font-semibold text-barro-900 hover:bg-barro-50"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Admin
                  </Link>
                )}
                <BotaoSino />
                <Link
                  href="/perfil"
                  className="flex h-11 items-center gap-2 rounded-[14px] px-3 font-semibold text-barro-900 hover:bg-barro-50"
                >
                  <Avatar url={sessao.avatarUrl} nome={sessao.primeiroNome} />
                  {sessao.primeiroNome ?? 'Você'}
                </Link>
                {sessao.negocioId ? (
                  <Link
                    href="/painel/negocio"
                    className="flex h-11 items-center gap-2 rounded-[14px] bg-serra px-4 font-bold text-white hover:bg-serra-escuro"
                  >
                    <Store className="h-4 w-4" /> Meu negócio
                  </Link>
                ) : (
                  <BotaoAnunciar />
                )}
              </>
            ) : (
              <>
                <Link
                  href="/entrar"
                  className="flex h-11 items-center rounded-[14px] px-4 font-semibold text-barro-900 hover:bg-barro-50"
                >
                  Entrar
                </Link>
                <BotaoAnunciar />
              </>
            )}
          </div>
        </div>
      </header>

      {/* celular: topo simples nas telas que não têm o próprio */}
      {!topoProprio && (
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-barro-200/80 bg-superficie/95 px-4 py-2.5 backdrop-blur md:hidden">
          {eAba ? (
            <Link href="/" className="flex min-h-11 items-center text-mata-700">
              <MarcaTangua tamanho="sm" />
              <span className="sr-only">Página inicial</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
              aria-label="Voltar"
              className="-ml-1 flex h-11 w-11 items-center justify-center rounded-[14px] text-barro-900 hover:bg-barro-50"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {!eAba && (
            <Link href="/" className="flex min-h-11 items-center text-mata-700">
              <MarcaTangua tamanho="sm" />
              <span className="sr-only">Página inicial</span>
            </Link>
          )}
          <div className="ml-auto">
            <BotaoSino />
          </div>
        </header>
      )}
    </>
  )
}

function BotaoAnunciar() {
  return (
    <Link
      href="/cadastrar?papel=profissional"
      className="flex h-11 items-center rounded-[14px] bg-laranja px-[18px] font-bold text-tinta hover:bg-laranja-claro"
    >
      Anunciar grátis
    </Link>
  )
}

export function Avatar({ url, nome, tamanho = 28 }: { url: string | null; nome: string | null; tamanho?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={tamanho} height={tamanho} className="rounded-full object-cover" style={{ width: tamanho, height: tamanho }} />
  }
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center rounded-full bg-mata-100 font-bold text-mata-700"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.42 }}
    >
      {(nome ?? '?').charAt(0).toUpperCase()}
    </span>
  )
}
