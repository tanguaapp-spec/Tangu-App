import { createClient } from '@/lib/supabase/server'
import { FormularioEditarNegocio } from '@/components/painel/formulario-editar-negocio'
import { FormularioCriarPost } from '@/components/painel/formulario-criar-post'
import { Eye, MessageCircle, Star, Store } from 'lucide-react'
import Link from 'next/link'
import { Botao } from '@/components/ui/botao'

export default async function PainelNegocio() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('reivindicado_por', user!.id)
    .maybeSingle()

  if (!negocio) {
    return (
      <div className="mx-auto max-w-lg rounded-casca border border-barro-100 bg-white p-8 text-center shadow-feira">
        <Store className="mx-auto h-10 w-10 text-barro-300" />
        <h1 className="mt-3 font-display text-xl font-semibold text-barro-900">
          Você ainda não reivindicou nenhum negócio
        </h1>
        <p className="mt-2 text-barro-600">
          Procure seu comércio no diretório e clique em &quot;Este negócio é seu?&quot; para começar a gerenciá-lo.
        </p>
        <Link href="/buscar">
          <Botao className="mt-5">Buscar meu negócio</Botao>
        </Link>
      </div>
    )
  }

  const { data: posts } = await supabase
    .from('posts_negocio')
    .select('*')
    .eq('negocio_id', negocio.id)
    .order('criado_em', { ascending: false })

  const totalVisualizacoes = posts?.reduce((acc, p) => acc + (p.visualizacoes ?? 0), 0) ?? 0
  const totalCliques = posts?.reduce((acc, p) => acc + (p.cliques_contato ?? 0), 0) ?? 0

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-medium text-barro-900">{negocio.nome}</h1>
      <p className="text-barro-600">Gerencie as informações e novidades do seu negócio.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-barro-100 bg-white p-4">
          <Eye className="h-5 w-5 text-casca-500" />
          <p className="mt-2 text-2xl font-semibold text-barro-900">{totalVisualizacoes}</p>
          <p className="text-sm text-barro-500">Visualizações de posts</p>
        </div>
        <div className="rounded-xl border border-barro-100 bg-white p-4">
          <MessageCircle className="h-5 w-5 text-mata-500" />
          <p className="mt-2 text-2xl font-semibold text-barro-900">{totalCliques}</p>
          <p className="text-sm text-barro-500">Cliques em &quot;Chamar no WhatsApp&quot;</p>
        </div>
        <div className="rounded-xl border border-barro-100 bg-white p-4">
          <Star className="h-5 w-5 text-casca-500" />
          <p className="mt-2 text-2xl font-semibold text-barro-900">{negocio.nota_google?.toFixed(1) ?? '—'}</p>
          <p className="text-sm text-barro-500">Nota no Google</p>
        </div>
      </div>

      <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Informações do negócio</h2>
        <div className="mt-4">
          <FormularioEditarNegocio negocio={negocio as any} />
        </div>
      </div>

      <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Publicar novidade</h2>
        <div className="mt-4">
          <FormularioCriarPost negocioId={negocio.id} />
        </div>
      </div>

      {posts && posts.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-barro-900">Seus posts</h2>
          <div className="mt-3 space-y-2">
            {posts.map((post) => (
              <div key={post.id} className="rounded-xl border border-barro-100 bg-white p-4">
                <p className="font-medium text-barro-900">{post.titulo}</p>
                <p className="text-sm text-barro-500">
                  {post.visualizacoes} visualizações · {post.cliques_contato} cliques
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
