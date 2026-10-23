'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * Quem está usando o app, lido no navegador. As páginas públicas continuam
 * em cache (iguais pra todo mundo); só o que é pessoal — saudação, sino com
 * não lidas, atalho "Meu negócio" — vem daqui, depois de montar.
 */
export type Sessao = {
  carregado: boolean
  logado: boolean
  primeiroNome: string | null
  avatarUrl: string | null
  naoLidas: number
  /** id do negócio que a pessoa administra (dona ou colaboradora), se houver */
  negocioId: string | null
  recarregar: () => void
}

const SESSAO_VAZIA: Sessao = {
  carregado: false,
  logado: false,
  primeiroNome: null,
  avatarUrl: null,
  naoLidas: 0,
  negocioId: null,
  recarregar: () => undefined,
}

const Contexto = createContext<Sessao>(SESSAO_VAZIA)

export function useSessao() {
  return useContext(Contexto)
}

// o cliente do Supabase (~70 KB) só baixa depois que a tela já apareceu
type Cliente = ReturnType<typeof import('@/lib/supabase/client').createClient>
let clientePromessa: Promise<Cliente> | null = null
function cliente() {
  clientePromessa ??= import('@/lib/supabase/client').then((m) => m.createClient())
  return clientePromessa
}
export { cliente as clienteSupabaseNavegador }

export function ProvedorSessao({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Omit<Sessao, 'recarregar'>>(SESSAO_VAZIA)

  const carregar = useCallback(async () => {
    const supabase = await cliente()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setEstado({ ...SESSAO_VAZIA, carregado: true })
      return
    }
    const [perfil, notificacoes, proprio, membro] = await Promise.all([
      supabase.rpc('meu_perfil').maybeSingle(),
      supabase.from('notificacoes').select('id', { count: 'exact', head: true }).eq('perfil_id', user.id).is('lida_em', null),
      supabase.from('negocios').select('id').eq('reivindicado_por', user.id).limit(1).maybeSingle(),
      supabase.from('membros_negocio').select('negocio_id').eq('perfil_id', user.id).limit(1).maybeSingle(),
    ])
    const p = perfil.data as { nome_completo?: string; avatar_url?: string | null } | null
    setEstado({
      carregado: true,
      logado: true,
      primeiroNome: p?.nome_completo?.trim().split(/\s+/)[0] ?? null,
      avatarUrl: p?.avatar_url ?? null,
      naoLidas: notificacoes.count ?? 0,
      negocioId: (proprio.data?.id as string | undefined) ?? (membro.data?.negocio_id as string | undefined) ?? null,
    })
  }, [])

  useEffect(() => {
    let cancelar = () => {}
    carregar()
    cliente().then((supabase) => {
      const { data } = supabase.auth.onAuthStateChange((evento) => {
        if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') carregar()
      })
      cancelar = () => data.subscription.unsubscribe()
    })
    // volta pro app (outra aba, app em segundo plano) → atualiza o sino
    const aoVoltar = () => document.visibilityState === 'visible' && carregar()
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      cancelar()
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [carregar])

  const valor = useMemo(() => ({ ...estado, recarregar: carregar }), [estado, carregar])
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
