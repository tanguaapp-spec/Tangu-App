'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X, MapPin, Briefcase, Megaphone, Search, User, LogOut, Store, Settings, Heart, Wrench } from 'lucide-react'
import { Botao } from '@/components/ui/botao'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { SinoNotificacoes } from '@/components/notificacoes/sino-notificacoes'
import { LogoTangua } from '@/components/marca/logo-tangua'
import type { Perfil } from '@/lib/types/database'

const linksNav = [
  { href: '/buscar', rotulo: 'Profissionais', icone: Search },
  { href: '/vagas', rotulo: 'Vagas', icone: Briefcase },
  { href: '/mural', rotulo: 'Mural da cidade', icone: Megaphone },
  { href: '/ferramentas', rotulo: 'Ferramentas', icone: Wrench },
  { href: '/favoritos', rotulo: 'Favoritos', icone: Heart },
]

export function Cabecalho() {
  const [menuAberto, setMenuAberto] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data } = await supabase.from('perfis').select('*').eq('id', user.id).single()
        setPerfil(data)
      }
    }

    checkAuth()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (session?.user) {
        supabase.from('perfis').select('*').eq('id', session.user.id).single().then(({ data }) => setPerfil(data))
      } else {
        setPerfil(null)
      }
    })

    return () => authListener.subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
    window.location.href = '/'
  }

  return (
    <header className="casca-divisor sticky top-0 z-50 border-b border-barro-100 bg-feira/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <LogoTangua className="h-9 w-9 transition-transform group-hover:rotate-12" />
          <span className="font-display text-xl font-semibold text-barro-900">
            Tanguá <span className="text-casca-500">App</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {linksNav.map((link) => {
            const ativo = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  ativo ? 'bg-casca-100 text-casca-700' : 'text-barro-700 hover:bg-barro-100 hover:text-barro-900'
                )}
              >
                <link.icone className="h-4 w-4" />
                {link.rotulo}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <SinoNotificacoes logado={!!user} />
              <Link href="/perfil">
                <Botao variante="fantasma" tamanho="sm">
                  <User className="h-4 w-4" />
                  Meu perfil
                </Botao>
              </Link>
              <Link href="/painel/negocio">
                <Botao variante="fantasma" tamanho="sm">
                  <Store className="h-4 w-4" />
                  Meu painel
                </Botao>
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-barro-700 hover:text-barro-900">
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/entrar">
                <Botao variante="fantasma" tamanho="sm">
                  <User className="h-4 w-4" />
                  Entrar
                </Botao>
              </Link>
              <Link href="/cadastrar?papel=profissional">
                <Botao variante="primario" tamanho="sm">
                  Cadastrar meu negócio
                </Botao>
              </Link>
            </>
          )}
        </div>

        <button
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuAberto(!menuAberto)}
          className="rounded-lg p-2 text-barro-800 hover:bg-barro-100 md:hidden"
        >
          {menuAberto ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuAberto && (
        <div className="border-t border-barro-100 bg-feira px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {linksNav.map((link) => {
              const ativo = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuAberto(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-3',
                    ativo ? 'bg-casca-100 font-medium text-casca-700' : 'text-barro-800 hover:bg-barro-100'
                  )}
                >
                  <link.icone className="h-5 w-5" />
                  {link.rotulo}
                </Link>
              )
            })}
            <hr className="my-2 border-barro-100" />
            {user ? (
            <>
              <div className="px-3 py-2 text-sm text-barro-700 font-medium">
                Olá, {perfil?.nome_completo?.split(' ')[0] || 'usuário'}!
              </div>
              <Link
                href="/perfil"
                onClick={() => setMenuAberto(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-barro-800 hover:bg-barro-100"
              >
                <User className="h-5 w-5" />
                Meu perfil
              </Link>
              <Link
                href="/painel/negocio"
                onClick={() => setMenuAberto(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-barro-800 hover:bg-barro-100"
              >
                <Store className="h-5 w-5" />
                Meu painel
              </Link>
              <SinoNotificacoes logado={!!user} comRotulo />
              <button
                onClick={() => {
                  handleLogout()
                  setMenuAberto(false)
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-3 text-barro-800 hover:bg-barro-100 text-left"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </button>
            </>
          ) : (
              <>
                <Link
                  href="/entrar"
                  onClick={() => setMenuAberto(false)}
                  className="rounded-lg px-3 py-3 text-barro-800 hover:bg-barro-100"
                >
                  Entrar
                </Link>
                <Link href="/cadastrar?papel=profissional" onClick={() => setMenuAberto(false)}>
                  <Botao variante="primario" className="w-full mt-1">
                    Cadastrar meu negócio
                  </Botao>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
