import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarCategorias } from '@/lib/queries/negocios'
import { AssistenteBoasVindas } from '@/components/perfil/assistente-boas-vindas'
import type { Categoria, Perfil } from '@/lib/types/database'

export const metadata: Metadata = { title: 'Boas-vindas', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaBemVindo() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/entrar?next=/bem-vindo')

  const [{ data: perfil }, categorias] = await Promise.all([supabase.rpc('meu_perfil').maybeSingle<Perfil>(), buscarCategorias()])
  const primeiroNome = perfil?.nome_completo?.split(' ')[0] ?? ''

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-casca-700">Conta confirmada 🍊</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-barro-900">Bem-vindo(a){primeiroNome ? `, ${primeiroNome}` : ''}!</h1>
      <p className="mt-2 text-barro-700">
        Duas perguntas rápidas pra deixar o app com a sua cara. É opcional — você já pode{' '}
        <Link href="/buscar" className="underline">
          explorar a cidade
        </Link>{' '}
        agora mesmo.
      </p>
      <div className="mt-8 rounded-casca border border-barro-100 bg-superficie p-6 shadow-feira">
        <AssistenteBoasVindas categorias={categorias as Categoria[]} bairroAtual={perfil?.bairro ?? null} />
      </div>
      <p className="mt-6 text-sm text-barro-600">
        Tem um negócio ou trabalha por conta própria?{' '}
        <Link href="/painel/negocio/cadastrar" className="font-semibold text-casca-700 underline">
          Cadastre grátis
        </Link>
        .
      </p>
    </div>
  )
}
