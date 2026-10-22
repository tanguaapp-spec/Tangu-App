import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { FormularioChamado } from '@/components/ajuda/formulario-chamado'
import { categoriaDoAssunto } from '@/lib/ajuda/chamados'

export const metadata: Metadata = { title: 'Falar com o suporte', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function PaginaContato({ searchParams }: { searchParams: { assunto?: string; artigo?: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: email } = await createServiceClient().from('configuracoes_sistema').select('valor').eq('chave', 'suporte_email').maybeSingle()
  const emailSuporte = typeof email?.valor === 'string' && email.valor ? email.valor : null

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-barro-900">Falar com o suporte</h1>
      <p className="mt-1 text-barro-600">
        Respondemos pelo próprio app — você recebe um aviso quando houver resposta.{' '}
        <Link href="/ajuda" className="underline">
          Ver a central de ajuda
        </Link>
      </p>

      <div className="mt-6 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        {user ? (
          <FormularioChamado
            categoriaInicial={categoriaDoAssunto(searchParams.assunto)}
            paginaOrigem={searchParams.artigo ? `/ajuda/${searchParams.artigo}` : undefined}
          />
        ) : (
          <p className="text-barro-700">
            Pra abrir um chamado e acompanhar a resposta,{' '}
            <Link href="/entrar?next=/ajuda/contato" className="font-semibold text-casca-700 underline">
              entre na sua conta
            </Link>
            . Não consegue entrar?{' '}
            <Link href="/ajuda/recuperar-acesso" className="font-semibold text-casca-700 underline">
              Veja como recuperar o acesso
            </Link>
            {emailSuporte && (
              <>
                {' '}
                ou escreva para <a href={`mailto:${emailSuporte}`} className="font-semibold underline">{emailSuporte}</a>
              </>
            )}
            .
          </p>
        )}
      </div>
    </div>
  )
}
