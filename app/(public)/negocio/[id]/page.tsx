import { buscarNegocioPorId, isFavorito, buscarCupomAtivo, buscarCartaoFidelidade } from '@/lib/queries/negocios'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import {
  MapPin,
  MessageCircle,
  Instagram,
  Globe,
  Star,
  Clock,
  Store,
  ArrowLeft,
  Heart,
} from 'lucide-react'
import { SeloVerificado, Selo } from '@/components/ui/selo'
import { SelosModalidade } from '@/components/negocio/selos-modalidade'
import { formatarPrecoBRL, urlSegura } from '@/lib/utils'
import { BotaoReivindicar } from '@/components/negocio/botao-reivindicar'
import { BotaoFavoritar } from '@/components/negocio/botao-favoritar'
import { BotaoWhatsapp } from '@/components/negocio/botao-whatsapp'
import { FormularioAvaliacao } from '@/components/negocio/formulario-avaliacao'
import { registrarEventoPerfil } from '@/lib/metricas/eventos-perfil'
import { CupomBanner } from '@/components/negocio/cupom-banner'
import { SeloRespondeRapido, negocioEstaAtivo } from '@/components/negocio/selo-responde-rapido'
import { BotaoDenunciar } from '@/components/moderacao/botao-denunciar'
import { BotaoCompartilhar } from '@/components/ui/botao-compartilhar'

const diasSemana: Record<string, string> = {
  seg: 'Segunda',
  ter: 'Terça',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sábado',
  dom: 'Domingo',
}

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tangua-app.vercel.app').replace(/\/+$/, '')

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const negocio = await buscarNegocioPorId(params.id)
  if (!negocio) return { title: 'Negócio não encontrado', robots: { index: false } }
  const descricao =
    negocio.descricao?.slice(0, 155) ??
    `${negocio.categoria?.nome ?? 'Negócio local'}${negocio.bairro ? ` em ${negocio.bairro}` : ''}, Tanguá-RJ. Contato direto pelo WhatsApp.`
  return {
    title: `${negocio.nome}${negocio.categoria ? ` — ${negocio.categoria.nome}` : ''}`,
    description: descricao,
    alternates: { canonical: `/negocio/${negocio.id}` },
    openGraph: {
      type: 'profile',
      title: negocio.nome,
      description: descricao,
      url: `${SITE}/negocio/${negocio.id}`,
      images: negocio.foto_capa_url ? [{ url: negocio.foto_capa_url, alt: negocio.nome }] : undefined,
    },
  }
}

/** Dados estruturados só com o que o dono informou — nada inventado. */
function jsonLdNegocio(negocio: NonNullable<Awaited<ReturnType<typeof buscarNegocioPorId>>>, notaMedia: number | null, totalAvaliacoes: number) {
  const autonomo = negocio.tipo_perfil === 'autonomo'
  const dados: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: negocio.nome,
    url: `${SITE}/negocio/${negocio.id}`,
  }
  if (negocio.descricao) dados.description = negocio.descricao
  if (negocio.foto_capa_url) dados.image = negocio.foto_capa_url
  if (negocio.telefone || negocio.whatsapp) dados.telephone = `+55${negocio.telefone ?? negocio.whatsapp}`
  if (!autonomo && negocio.endereco) {
    dados.address = {
      '@type': 'PostalAddress',
      streetAddress: negocio.endereco,
      addressLocality: 'Tanguá',
      addressRegion: 'RJ',
      addressCountry: 'BR',
    }
  } else {
    dados.areaServed = negocio.area_atendimento || 'Tanguá, RJ'
  }
  const sameAs = [urlSegura(negocio.site), negocio.instagram ? `https://instagram.com/${negocio.instagram.replace('@', '')}` : null].filter(Boolean)
  if (sameAs.length) dados.sameAs = sameAs
  if (notaMedia !== null && totalAvaliacoes > 0) {
    dados.aggregateRating = { '@type': 'AggregateRating', ratingValue: notaMedia.toFixed(1), reviewCount: totalAvaliacoes }
  }
  return dados
}

export default async function PaginaNegocio({ params }: { params: { id: string } }) {
  const negocio = await buscarNegocioPorId(params.id)
  if (!negocio) notFound()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  await registrarEventoPerfil(params.id, 'visualizacao', { usuarioId: user?.id ?? null, donoId: negocio.reivindicado_por })
  const isFav = await isFavorito(params.id)

  const { data: avaliacoes } = await supabase
    .from('avaliacoes')
    .select('*, autor:perfis(nome_completo, avatar_url)')
    .eq('negocio_id', params.id)
    .order('criado_em', { ascending: false })

  const { data: posts } = await supabase
    .from('posts_negocio')
    .select('*')
    .eq('negocio_id', params.id)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })

  const { data: produtos } = await supabase
    .from('produtos_servicos')
    .select('*')
    .eq('negocio_id', params.id)
    .eq('ativo', true)
    .order('ordem')
    .order('criado_em')

  // RLS de favoritos só libera pro próprio dono/favoritador — a contagem
  // pública precisa do service role pra não ficar zerada pra quem visita.
  const { count: totalFavoritos } = await createServiceClient()
    .from('favoritos')
    .select('*', { count: 'exact', head: true })
    .eq('negocio_id', params.id)

  const cupomAtivo = await buscarCupomAtivo(params.id)
  const { data: meuResgate } =
    cupomAtivo && user
      ? await supabase.from('cupom_resgates').select('codigo').eq('cupom_id', cupomAtivo.id).eq('perfil_id', user.id).maybeSingle()
      : { data: null }
  const cartaoFidelidade = user ? await buscarCartaoFidelidade(params.id, user.id) : null

  const headerList = headers()
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host') ?? 'tangua-app.vercel.app'
  const protocolo = headerList.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  const urlPublica = `${protocolo}://${host}/negocio/${params.id}`

  const notas = (avaliacoes ?? []).map((a: { nota: number }) => a.nota)
  const notaMedia = notas.length ? notas.reduce((s: number, n: number) => s + n, 0) / notas.length : null
  // "<" escapado: o JSON vai dentro de <script> e não pode fechar a tag
  const jsonLd = JSON.stringify(jsonLdNegocio(negocio, notaMedia, notas.length)).replace(/</g, '\\u003c')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Link
        href="/buscar"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-barro-600 transition-colors hover:text-casca-600"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar pro diretório
      </Link>

      <div className="relative h-56 w-full overflow-hidden rounded-casca bg-barro-100 sm:h-72">
        {negocio.foto_capa_url ? (
          <Image src={negocio.foto_capa_url} alt={negocio.nome} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-barro-300">
            <Store className="h-16 w-16" />
          </div>
        )}
        <div className="absolute right-3 top-3 flex gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-feira">
            <BotaoCompartilhar
              titulo={negocio.nome}
              texto={`Confira ${negocio.nome} no Tanguá App`}
              url={urlPublica}
              rotulo="Compartilhar perfil"
              iconApenas
              className="h-9 w-9 text-barro-700"
            />
          </span>
          {user && (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-feira">
              <BotaoFavoritar negocioId={params.id} initialIsFavorito={isFav} />
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-3xl font-semibold text-barro-900">{negocio.nome}</h1>
            {negocio.verificado && <SeloVerificado />}
            {negocioEstaAtivo(negocio.atualizado_em) && <SeloRespondeRapido />}
            {negocio.aberto_agora !== null && (
              <Selo tom={negocio.aberto_agora ? 'verde' : 'neutro'}>
                {negocio.aberto_agora ? 'Aberto agora' : 'Fechado agora'}
              </Selo>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {negocio.categoria && <Selo tom="laranja">{negocio.categoria.nome}</Selo>}
            {negocio.bairro && <Selo tom="neutro">{negocio.bairro}</Selo>}
          </div>

          <SelosModalidade modalidades={negocio.modalidades_atendimento} className="mt-2" />

          {cupomAtivo && <CupomBanner cupom={cupomAtivo} logado={!!user} codigoExistente={meuResgate?.codigo ?? null} />}

          {negocio.descricao && <p className="mt-4 text-barro-700">{negocio.descricao}</p>}

          <div className="mt-5 flex flex-col gap-2 text-barro-700">
            {negocio.tipo_perfil !== 'autonomo' && negocio.endereco && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-barro-400" /> {negocio.endereco}
              </span>
            )}
            {negocio.tipo_perfil === 'autonomo' && negocio.area_atendimento && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-barro-400" /> Atende: {negocio.area_atendimento}
              </span>
            )}
            {!negocio.endereco &&
              negocio.modalidades_atendimento?.length > 0 &&
              !negocio.modalidades_atendimento.some((m) => m === 'loja_fisica' || m === 'atende_em_casa') && (
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-barro-400" /> Atendimento sem endereço fixo
                </span>
              )}
            {negocio.nota_google && (
              <span className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-casca-400 text-casca-400" />
                {negocio.nota_google.toFixed(1)} no Google ({negocio.total_avaliacoes_google} avaliações)
              </span>
            )}
            {!!totalFavoritos && totalFavoritos > 0 && (
              <span className="flex items-center gap-2 text-sm text-barro-600">
                <Heart className="h-4 w-4 fill-casca-400 text-casca-400" />
                {totalFavoritos} {totalFavoritos === 1 ? 'pessoa favoritou' : 'pessoas favoritaram'} este perfil
              </span>
            )}
          </div>

          {negocio.horario_funcionamento && (
            <div className="mt-5">
              <h3 className="flex items-center gap-2 font-semibold text-barro-800">
                <Clock className="h-4 w-4" /> Horário de funcionamento
              </h3>
              <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-barro-600 sm:grid-cols-3">
                {Object.entries(negocio.horario_funcionamento).map(([dia, horario]) => (
                  <li key={dia}>
                    <span className="font-medium">{diasSemana[dia] ?? dia}:</span> {horario as string}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {negocio.formas_pagamento && negocio.formas_pagamento.length > 0 && (
            <div className="mt-5">
              <h3 className="font-semibold text-barro-800">Formas de pagamento</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {negocio.formas_pagamento.map((forma) => (
                  <Selo key={forma} tom="neutro">
                    {forma}
                  </Selo>
                ))}
              </div>
            </div>
          )}

          {negocio.galeria && negocio.galeria.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-xl font-semibold text-barro-900">Fotos</h3>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {negocio.galeria.map((url) => (
                  <div key={url} className="relative h-32 overflow-hidden rounded-xl bg-barro-100">
                    <Image src={url} alt={`Foto de ${negocio.nome}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {produtos && produtos.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-xl font-semibold text-barro-900">Catálogo</h3>
              <div className="mt-3 divide-y divide-barro-100 rounded-xl border border-barro-100 bg-white">
                {produtos.map((produto) => (
                  <div key={produto.id} className="flex items-start justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium text-barro-900">{produto.nome}</p>
                      {produto.descricao && <p className="mt-0.5 text-sm text-barro-500">{produto.descricao}</p>}
                    </div>
                    {produto.preco != null && (
                      <span className="shrink-0 font-semibold text-mata-700">
                        {formatarPrecoBRL(produto.preco, produto.preco_a_partir_de)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts/novidades do profissional */}
          {posts && posts.length > 0 && (
            <div className="mt-8">
              <h3 className="font-display text-xl font-semibold text-barro-900">Novidades</h3>
              <div className="mt-3 space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-barro-100 bg-white p-4">
                    <Selo tom={post.tipo === 'promocao' ? 'laranja' : 'verde'}>
                      {post.tipo === 'promocao' ? 'Promoção' : post.tipo === 'vaga_propria' ? 'Vaga' : 'Novidade'}
                    </Selo>
                    <h4 className="mt-2 font-semibold text-barro-900">{post.titulo}</h4>
                    {post.conteudo && <p className="mt-1 text-sm text-barro-600">{post.conteudo}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Avaliações */}
          <div className="mt-8">
            <h3 className="font-display text-xl font-semibold text-barro-900">
              Avaliações da comunidade
            </h3>
            {user && <FormularioAvaliacao negocioId={params.id} />}
            {!avaliacoes || avaliacoes.length === 0 ? (
              <p className="mt-2 text-barro-500">Seja o primeiro a avaliar este negócio.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {avaliacoes.map((av: any) => (
                  <div key={av.id} className="rounded-xl border border-barro-100 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-barro-800">{av.autor?.nome_completo}</span>
                      <span className="flex items-center gap-1 text-casca-500">
                        {Array.from({ length: av.nota }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </span>
                    </div>
                    {av.comentario && <p className="mt-1.5 text-sm text-barro-600">{av.comentario}</p>}
                    {av.foto_url && (
                      <div className="relative mt-2 h-40 w-full max-w-xs overflow-hidden rounded-lg bg-barro-100">
                        <Image src={av.foto_url} alt="Foto enviada na avaliação" fill className="object-cover" />
                      </div>
                    )}
                    {av.resposta_profissional && (
                      <div className="mt-2 rounded-lg bg-barro-50 p-2.5 text-sm text-barro-700">
                        <span className="font-semibold">Resposta do profissional:</span> {av.resposta_profissional}
                      </div>
                    )}
                    <BotaoDenunciar
                      tipoConteudo="avaliacao"
                      conteudoId={av.id}
                      negocioId={params.id}
                      logado={!!user}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar de contato */}
        <aside className="space-y-3">
          <div className="rounded-casca border border-barro-100 bg-white p-5 shadow-feira">
            {negocio.whatsapp && (
              <BotaoWhatsapp
                negocioId={negocio.id}
                whatsapp={negocio.whatsapp}
                mensagem="Olá! Vi seu perfil no Tanguá App."
                className="flex items-center justify-center gap-2 rounded-xl bg-mata-500 py-3 font-semibold text-white transition-colors hover:bg-mata-600"
              >
                <MessageCircle className="h-5 w-5" /> Chamar no WhatsApp
              </BotaoWhatsapp>
            )}
            {negocio.reivindicado_por && negocio.reivindicado_por !== user?.id && (
              <Link
                href={`/orcamentos/novo?negocio=${negocio.id}`}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl border border-barro-300 py-2.5 font-semibold text-barro-800 transition-colors hover:bg-barro-50"
              >
                Pedir orçamento
              </Link>
            )}
            <div className="mt-3 flex flex-col gap-2 text-sm">
              {negocio.instagram && (
                <a
                  href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-barro-700 hover:text-casca-600"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-barro-100">
                    <Instagram className="h-3.5 w-3.5" />
                  </span>
                  @{negocio.instagram.replace('@', '')}
                </a>
              )}
              {urlSegura(negocio.site) && (
                <a
                  href={urlSegura(negocio.site)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-barro-700 hover:text-casca-600"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-barro-100">
                    <Globe className="h-3.5 w-3.5" />
                  </span>
                  Site oficial
                </a>
              )}
            </div>
          </div>

          {cartaoFidelidade && (
            <div className="rounded-casca border border-barro-100 bg-white p-4 shadow-feira">
              <p className="text-sm font-semibold text-barro-800">Seu cartão fidelidade</p>
              <div className="mt-2 flex gap-1">
                {Array.from({ length: cartaoFidelidade.meta }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full ${i < cartaoFidelidade.carimbos ? 'bg-casca-500' : 'bg-barro-100'}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-barro-500">
                {cartaoFidelidade.carimbos >= cartaoFidelidade.meta
                  ? 'Completo! Mostre esse cartão pro dono resgatar seu prêmio.'
                  : `${cartaoFidelidade.carimbos}/${cartaoFidelidade.meta} carimbos`}
              </p>
            </div>
          )}

          {!negocio.reivindicado_por && <BotaoReivindicar negocioId={negocio.id} />}

          <div className="px-1">
            <BotaoDenunciar tipoConteudo="negocio" conteudoId={negocio.id} negocioId={negocio.id} logado={!!user} />
          </div>
        </aside>
      </div>
    </div>
  )
}
