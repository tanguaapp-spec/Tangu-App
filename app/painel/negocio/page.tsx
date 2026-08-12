import { createClient } from '@/lib/supabase/server'
import { buscarCategorias } from '@/lib/queries/negocios'
import { FormularioEditarNegocio } from '@/components/painel/formulario-editar-negocio'
import { FormularioCriarPost } from '@/components/painel/formulario-criar-post'
import { FormularioCriarVagaPropria } from '@/components/painel/formulario-criar-vaga-propria'
import { FormularioCriarProduto } from '@/components/painel/formulario-criar-produto'
import { ListaProdutos } from '@/components/painel/lista-produtos'
import { BotaoEncerrarVaga } from '@/components/painel/botao-encerrar-vaga'
import { AlternadorAbertoAgora } from '@/components/painel/alternador-aberto-agora'
import { CartaoDivulgacao } from '@/components/painel/cartao-divulgacao'
import { CartaoFerramentaParceira } from '@/components/painel/cartao-ferramenta-parceira'
import { reenviarCadastroNegocio } from '@/lib/actions/painel-negocio-actions'
import { Eye, MessageCircle, Star, Store, Clock3, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Botao } from '@/components/ui/botao'
import { Selo } from '@/components/ui/selo'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PainelNegocio() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*, categoria:categorias(*)')
    .eq('reivindicado_por', user.id)
    .maybeSingle()

  if (!negocio) {
    return (
      <div className="mx-auto max-w-lg rounded-casca border border-barro-100 bg-white p-8 text-center shadow-feira">
        <Store className="mx-auto h-10 w-10 text-barro-300" />
        <h1 className="mt-3 font-display text-xl font-semibold text-barro-900">
          Você ainda não tem um negócio cadastrado
        </h1>
        <p className="mt-2 text-barro-600">
          Se seu negócio já aparece no diretório (importado do Google), procure e reivindique o perfil.
          Se não aparece — inclusive se você é autônomo, sem loja física — cadastre agora mesmo.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/painel/negocio/cadastrar">
            <Botao className="w-full sm:w-auto">Cadastrar meu negócio agora</Botao>
          </Link>
          <Link href="/buscar">
            <Botao variante="fantasma" className="w-full sm:w-auto">
              Buscar meu negócio existente
            </Botao>
          </Link>
        </div>
      </div>
    )
  }

  if (negocio.status_cadastro === 'pendente' || negocio.status_cadastro === 'rejeitado') {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          className={`rounded-casca border p-8 text-center shadow-feira ${
            negocio.status_cadastro === 'rejeitado' ? 'border-red-200 bg-red-50' : 'border-casca-200 bg-casca-50'
          }`}
        >
          {negocio.status_cadastro === 'rejeitado' ? (
            <ShieldAlert className="mx-auto h-10 w-10 text-red-400" />
          ) : (
            <Clock3 className="mx-auto h-10 w-10 text-casca-400" />
          )}
          <h1 className="mt-3 font-display text-xl font-semibold text-barro-900">{negocio.nome}</h1>
          {negocio.status_cadastro === 'pendente' ? (
            <p className="mt-2 text-barro-700">
              Seu cadastro está em análise pela nossa equipe. Assim que for aprovado, seu negócio aparece no
              diretório e você libera novidades, vagas e divulgação.
            </p>
          ) : (
            <>
              <p className="mt-2 text-barro-700">Seu cadastro não foi aprovado desta vez.</p>
              {negocio.motivo_rejeicao && (
                <p className="mt-2 rounded-lg bg-white/70 p-3 text-sm text-barro-700">
                  <span className="font-medium">Motivo:</span> {negocio.motivo_rejeicao}
                </p>
              )}
              <form action={async () => { 'use server'; await reenviarCadastroNegocio(negocio.id) }} className="mt-4">
                <Botao type="submit" tamanho="sm">
                  Ajustei os dados, reenviar para análise
                </Botao>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
          <h2 className="font-display text-lg font-semibold text-barro-900">Enquanto isso, complete seu perfil</h2>
          <div className="mt-4">
            <FormularioEditarNegocio negocio={negocio as any} categorias={(await buscarCategorias()) as any} />
          </div>
        </div>
      </div>
    )
  }

  const [{ data: posts }, { data: vagasProprias }, { count: totalAvaliacoes }, { data: mediaAvaliacoes }, { data: produtos }] =
    await Promise.all([
      supabase.from('posts_negocio').select('*').eq('negocio_id', negocio.id).order('criado_em', { ascending: false }),
      supabase.from('vagas').select('*').eq('negocio_id', negocio.id).order('criado_em', { ascending: false }),
      supabase.from('avaliacoes').select('*', { count: 'exact', head: true }).eq('negocio_id', negocio.id),
      supabase.from('avaliacoes').select('nota').eq('negocio_id', negocio.id),
      supabase.from('produtos_servicos').select('*').eq('negocio_id', negocio.id).order('ordem').order('criado_em'),
    ])

  const totalVisualizacoes = posts?.reduce((acc, p) => acc + (p.visualizacoes ?? 0), 0) ?? 0
  const totalCliques = posts?.reduce((acc, p) => acc + (p.cliques_contato ?? 0), 0) ?? 0
  const notasMedia = mediaAvaliacoes?.length
    ? (mediaAvaliacoes.reduce((acc, a) => acc + a.nota, 0) / mediaAvaliacoes.length).toFixed(1)
    : '—'

  const headerList = headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'localhost:3000'
  const protocolo = headerList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const urlPublica = `${protocolo}://${host}/negocio/${negocio.id}`

  const categorias = await buscarCategorias()

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-balance text-barro-900">{negocio.nome}</h1>
            {negocio.verificado && <Selo tom="verde">Verificado</Selo>}
          </div>
          <p className="text-barro-600">Gerencie as informações e novidades do seu negócio.</p>
        </div>
        <AlternadorAbertoAgora negocioId={negocio.id} valorInicial={negocio.aberto_agora} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
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
          <p className="mt-2 text-2xl font-semibold text-barro-900">{notasMedia}</p>
          <p className="text-sm text-barro-500">Nota média ({totalAvaliacoes ?? 0} avaliações)</p>
        </div>
        <div className="rounded-xl border border-barro-100 bg-white p-4">
          <Star className="h-5 w-5 text-casca-500" />
          <p className="mt-2 text-2xl font-semibold text-barro-900">{negocio.nota_google?.toFixed(1) ?? '—'}</p>
          <p className="text-sm text-barro-500">Nota no Google</p>
        </div>
      </div>

      <CartaoDivulgacao urlPublica={urlPublica} nomeNegocio={negocio.nome} />

      <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Informações do negócio</h2>
        <div className="mt-4">
          <FormularioEditarNegocio negocio={negocio as any} categorias={categorias as any} />
        </div>
      </div>

      <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Catálogo de produtos e serviços</h2>
        <p className="text-sm text-barro-500">Quem já vê o preço chega mais decidido a fechar.</p>
        <div className="mt-4">
          <ListaProdutos produtos={(produtos as any) ?? []} negocioId={negocio.id} />
        </div>
        <div className="mt-4 border-t border-barro-100 pt-4">
          <FormularioCriarProduto negocioId={negocio.id} />
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

      <div className="mt-8 rounded-casca border border-barro-100 bg-white p-6 shadow-feira">
        <h2 className="font-display text-lg font-semibold text-barro-900">Publicar vaga do seu negócio</h2>
        <p className="text-sm text-barro-500">Está contratando? Publique direto pro mural de vagas da cidade.</p>
        <div className="mt-4">
          <FormularioCriarVagaPropria negocioId={negocio.id} />
        </div>
      </div>

      {vagasProprias && vagasProprias.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-barro-900">Suas vagas</h2>
          <div className="mt-3 space-y-2">
            {vagasProprias.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl border border-barro-100 bg-white p-4">
                <div>
                  <p className="font-medium text-barro-900">{v.titulo}</p>
                  <p className="text-sm text-barro-500">{v.area}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Selo tom={v.status === 'aberta' ? 'verde' : 'neutro'}>{v.status}</Selo>
                  {v.status === 'aberta' && <BotaoEncerrarVaga vagaId={v.id} origem="propria" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CartaoFerramentaParceira categoriaSlug={negocio.categoria?.slug} />
    </div>
  )
}
