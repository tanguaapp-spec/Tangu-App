import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { BadgeCheck, ChevronLeft, FileText, Globe, Instagram, MessageCircle, Navigation, Star } from 'lucide-react'
import { buscarNegocioPorSlugOuId, isFavorito, buscarCupomAtivo, buscarCartaoFidelidade } from '@/lib/queries/negocios'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { registrarEventoPerfil, lerOrigem } from '@/lib/metricas/eventos-perfil'
import { situacaoHorario, resumoSemana } from '@/lib/horario/funcionamento'
import { formatarNota, notaNegocio, urlNegocio } from '@/lib/ui/apresentacao'
import { rotuloModalidade } from '@/lib/modalidades'
import { formatarPrecoBRL, urlSegura } from '@/lib/utils'
import { urlDoSite } from '@/lib/site'
import { BotaoFavoritar } from '@/components/negocio/botao-favoritar'
import { BotaoWhatsapp } from '@/components/negocio/botao-whatsapp'
import { BotaoVoltar } from '@/components/negocio/botao-voltar'
import { BotaoSalvarProduto } from '@/components/negocio/botao-salvar-produto'
import { AvisoNaoReivindicado } from '@/components/negocio/aviso-nao-reivindicado'
import { FormularioAvaliacao } from '@/components/negocio/formulario-avaliacao'
import { CupomBanner } from '@/components/negocio/cupom-banner'
import { BotaoDenunciar } from '@/components/moderacao/botao-denunciar'
import { BotaoCompartilhar } from '@/components/ui/botao-compartilhar'
import { FotoNegocio } from '@/components/vitrine/foto-negocio'
import { RegistrarVisto } from '@/components/home/vistos-recentemente'
import { BarraContato } from '@/components/negocio/barra-contato'
import { PedidoWhatsapp } from '@/components/negocio/pedido-whatsapp'
import { AgendaWhatsapp } from '@/components/negocio/agenda-whatsapp'
import { lerConfig } from '@/lib/config/ler'
import { recursosDoNegocio } from '@/lib/planos/recursos'
import type { Negocio } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tangua-app.vercel.app').replace(/\/+$/, '')

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const negocio = await buscarNegocioPorSlugOuId(params.id)
  if (!negocio) return { title: 'Negócio não encontrado', robots: { index: false } }
  const descricao =
    negocio.descricao?.slice(0, 155) ??
    `${negocio.categoria?.nome ?? 'Negócio local'}${negocio.bairro ? ` em ${negocio.bairro}` : ''}, Tanguá-RJ. Contato direto pelo WhatsApp.`
  const caminho = urlNegocio(negocio)
  return {
    title: `${negocio.nome}${negocio.categoria ? ` — ${negocio.categoria.nome}` : ''}`,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: {
      type: 'profile',
      title: negocio.nome,
      description: descricao,
      url: `${SITE}${caminho}`,
      // imagem: app/(public)/negocio/[id]/opengraph-image.tsx
    },
  }
}

/** Dados estruturados só com o que o dono informou — nada inventado. */
function jsonLdNegocio(negocio: Negocio, nota: { nota: number; total: number | null; fonte: string } | null) {
  const autonomo = negocio.tipo_perfil === 'autonomo'
  const dados: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: negocio.nome,
    url: `${SITE}${urlNegocio(negocio)}`,
  }
  if (negocio.descricao) dados.description = negocio.descricao
  if (negocio.foto_capa_url) dados.image = negocio.foto_capa_url
  if (negocio.telefone || negocio.whatsapp) dados.telephone = `+55${negocio.telefone ?? negocio.whatsapp}`
  if (!autonomo && negocio.endereco) {
    dados.address = { '@type': 'PostalAddress', streetAddress: negocio.endereco, addressLocality: 'Tanguá', addressRegion: 'RJ', addressCountry: 'BR' }
  } else {
    dados.areaServed = negocio.area_atendimento || 'Tanguá, RJ'
  }
  const sameAs = [urlSegura(negocio.site), negocio.instagram ? `https://instagram.com/${negocio.instagram.replace('@', '')}` : null].filter(Boolean)
  if (sameAs.length) dados.sameAs = sameAs
  if (nota?.fonte === 'comunidade' && nota.total) {
    dados.aggregateRating = { '@type': 'AggregateRating', ratingValue: nota.nota.toFixed(1), reviewCount: nota.total }
  }
  return dados
}

type Avaliacao = {
  id: string
  nota: number
  comentario: string | null
  foto_url: string | null
  resposta_profissional: string | null
  criado_em: string
  autor: { nome_completo: string; avatar_url: string | null } | null
}

const botaoCapa = 'flex h-11 w-11 items-center justify-center rounded-[14px] bg-white text-[#13241D] shadow-sm'

export default async function PaginaNegocio({ params, searchParams }: { params: { id: string }; searchParams: { origem?: string } }) {
  const supabase = createClient()
  // negócio e sessão em paralelo: cada ida ao banco custa uma viagem de rede
  const [negocio, {
    data: { user },
  }] = await Promise.all([buscarNegocioPorSlugOuId(params.id), supabase.auth.getUser()])
  if (!negocio) notFound()
  // link antigo (/negocio/<id>) → endereço amigável, sem perder a origem
  if (negocio.slug && params.id !== negocio.slug) {
    permanentRedirect(`/negocio/${negocio.slug}${searchParams.origem ? `?origem=${encodeURIComponent(searchParams.origem)}` : ''}`)
  }

  const id = negocio.id
  const caminho = urlNegocio(negocio)
  const eDono = !!user && negocio.reivindicado_por === user.id

  const [, isFav, { data: avaliacoesBrutas }, { data: posts }, { data: produtos }, { count: totalFavoritos }, cupomAtivo, cartaoFidelidade, salvos] =
    await Promise.all([
      registrarEventoPerfil(id, 'visualizacao', { usuarioId: user?.id ?? null, donoId: negocio.reivindicado_por, origem: lerOrigem(searchParams.origem) }),
      isFavorito(id),
      supabase.from('avaliacoes').select('*, autor:perfis(nome_completo, avatar_url)').eq('negocio_id', id).order('criado_em', { ascending: false }).limit(50),
      supabase.from('posts_negocio').select('*').eq('negocio_id', id).eq('ativo', true).neq('tipo', 'vaga_propria').order('criado_em', { ascending: false }).limit(6),
      supabase.from('produtos_servicos').select('*').eq('negocio_id', id).eq('ativo', true).order('ordem').order('criado_em'),
      // RLS de favoritos só libera pro próprio dono/favoritador — a contagem pública precisa do service role
      createServiceClient().from('favoritos').select('*', { count: 'exact', head: true }).eq('negocio_id', id),
      buscarCupomAtivo(id),
      user ? buscarCartaoFidelidade(id, user.id) : Promise.resolve(null),
      user ? supabase.from('favoritos_produtos').select('produto_id').eq('perfil_id', user.id) : Promise.resolve({ data: [] as { produto_id: string }[] }),
    ])

  // pedidos e agenda pelo WhatsApp: módulo ligado no admin + recurso do plano + dono ativou + tem WhatsApp
  const [modulos, recursos] = await Promise.all([lerConfig('modulos_ativos'), recursosDoNegocio(id)])
  const zap = negocio.whatsapp
  const podePedido = !!zap && modulos.pedidos_whatsapp !== false && recursos.recursos.pedidos_whatsapp === true && !!negocio.pedidos_whatsapp && (produtos ?? []).length > 0
  const podeAgenda = !!zap && modulos.agenda_whatsapp !== false && recursos.recursos.agenda_whatsapp === true && !!negocio.agenda_whatsapp
  const precoCentavos = (preco: number | null) => (preco === null || preco === undefined ? null : Math.round(Number(preco) * 100))

  const { data: meuResgate } =
    cupomAtivo && user
      ? await supabase.from('cupom_resgates').select('codigo').eq('cupom_id', cupomAtivo.id).eq('perfil_id', user.id).maybeSingle()
      : { data: null }

  const avaliacoes = (avaliacoesBrutas ?? []) as unknown as Avaliacao[]
  const salvosIds = new Set(((salvos as { data: { produto_id: string }[] | null }).data ?? []).map((s) => s.produto_id))
  // nota: a da comunidade (trigger da 0020) — antes da migration, calcula aqui
  const notaCalculada = avaliacoes.length ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length : null
  const nota =
    notaNegocio(negocio) ?? (notaCalculada ? { nota: notaCalculada, total: avaliacoes.length, fonte: 'comunidade' as const } : null)
  const horario = situacaoHorario(negocio.horario_funcionamento, negocio.aberto_agora)
  const semana = resumoSemana(negocio.horario_funcionamento)
  const urlPublica = `${urlDoSite()}${caminho}`
  const jsonLd = JSON.stringify(jsonLdNegocio(negocio, nota)).replace(/</g, '\\u003c')
  const autonomo = negocio.tipo_perfil === 'autonomo'
  const podeOrcamento = !!negocio.reivindicado_por && !eDono
  const mensagemWhats = 'Olá! Vi seu perfil no Tanguá App.'
  const meta = [
    negocio.categoria?.nome,
    negocio.bairro,
    nota ? `★ ${formatarNota(nota.nota)}${nota.fonte === 'comunidade' ? ` (${nota.total} ${nota.total === 1 ? 'avaliação' : 'avaliações'})` : ' no Google'}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const chips = [
    ...(negocio.modalidades_atendimento ?? []).map(rotuloModalidade),
    negocio.formas_pagamento?.length ? negocio.formas_pagamento.slice(0, 3).join(' · ') : null,
  ].filter(Boolean) as string[]

  // rota só pra ponto comercial (autônomo nunca expõe endereço)
  const destinoRota = autonomo
    ? null
    : negocio.latitude && negocio.longitude
      ? `${negocio.latitude},${negocio.longitude}`
      : negocio.endereco
        ? encodeURIComponent(`${negocio.endereco}${negocio.bairro ? `, ${negocio.bairro}` : ''}, Tanguá - RJ`)
        : null
  const avisoHorario = (negocio as { aviso_horario?: string | null }).aviso_horario ?? null
  const redesLiberadas = recursos.recursos.redes_sociais !== false
  const parceiro = recursos.recursos.selo_profissional === true

  const quadroHorario = (semana.length > 0 || negocio.endereco || negocio.area_atendimento) && (
    <div className="flex flex-col gap-2.5 rounded-[24px] border border-barro-200/80 bg-superficie p-5 text-[15px] text-barro-900">
      {semana.length > 0 && (
        <>
          <h2 className="font-display text-lg font-bold">Horário</h2>
          {avisoHorario && <p className="rounded-xl bg-casca-50 px-3 py-2 text-sm font-semibold text-casca-900">{avisoHorario}</p>}
          {semana.map((l) => (
            <div key={l.dias} className={`flex justify-between gap-3 ${l.fechado ? 'text-barro-600' : ''}`}>
              <span>{l.dias}</span>
              <span className={l.fechado ? '' : 'font-mono'}>{l.horas}</span>
            </div>
          ))}
        </>
      )}
      {(negocio.endereco || negocio.area_atendimento || negocio.bairro) && (
        <>
          <h2 className={`font-display text-lg font-bold ${semana.length ? 'mt-2.5' : ''}`}>{autonomo ? 'Onde atende' : 'Onde'}</h2>
          <p>
            {autonomo ? negocio.area_atendimento || 'Tanguá' : [negocio.endereco, negocio.bairro].filter(Boolean).join(' · ')}
          </p>
          {autonomo && <p className="text-[13px] text-barro-600">Perfis de autônomo mostram só a área de atendimento, nunca o endereço de casa.</p>}
          {destinoRota && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destinoRota}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-1.5 rounded-full border border-barro-200 px-4 text-sm font-semibold"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" /> Como chegar
              </a>
              <a
                href={
                  negocio.latitude && negocio.longitude
                    ? `https://waze.com/ul?ll=${negocio.latitude},${negocio.longitude}&navigate=yes`
                    : `https://waze.com/ul?q=${destinoRota}&navigate=yes`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center gap-1.5 rounded-full border border-barro-200 px-4 text-sm font-semibold"
              >
                <Navigation className="h-4 w-4" aria-hidden="true" /> Waze
              </a>
            </div>
          )}
        </>
      )}
      {redesLiberadas && (negocio.instagram || urlSegura(negocio.site)) && (
        <div className="mt-1 flex flex-wrap gap-2">
          {negocio.instagram && (
            <a
              href={`https://instagram.com/${negocio.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center gap-1.5 rounded-full border border-barro-200 px-3 text-sm font-semibold"
            >
              <Instagram className="h-4 w-4" aria-hidden="true" /> @{negocio.instagram.replace('@', '')}
            </a>
          )}
          {urlSegura(negocio.site) && (
            <a href={urlSegura(negocio.site)!} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-1.5 rounded-full border border-barro-200 px-3 text-sm font-semibold">
              <Globe className="h-4 w-4" aria-hidden="true" /> Site
            </a>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className="pb-[76px] md:mx-auto md:max-w-[1200px] md:px-6 md:pb-14 md:pt-5">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <RegistrarVisto
        negocio={{
          id,
          slug: negocio.slug,
          nome: negocio.nome,
          bairro: negocio.bairro,
          foto_capa_url: negocio.foto_capa_url,
          categoria: negocio.categoria ? { nome: negocio.categoria.nome, icone: negocio.categoria.icone } : null,
          nota_google: negocio.nota_google,
          nota_media: negocio.nota_media,
          total_avaliacoes: negocio.total_avaliacoes,
        }}
      />

      {negocio.categoria && (
        <Link
          href={`/categoria/${negocio.categoria.slug}`}
          className="hidden items-center gap-1.5 font-semibold text-barro-700 hover:text-mata-700 md:inline-flex"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> {negocio.categoria.nome} em Tanguá
        </Link>
      )}

      {/* capa */}
      <div className="relative md:mt-3.5">
        <FotoNegocio
          id={id}
          url={negocio.foto_capa_url}
          nome={negocio.nome}
          icone={negocio.categoria?.icone}
          tamanhos="(max-width: 768px) 100vw, 1200px"
          prioridade
          className="h-[220px] w-full md:h-[clamp(180px,26vw,320px)] md:rounded-[28px]"
        />
        <div className="absolute inset-x-4 top-[max(16px,env(safe-area-inset-top))] flex justify-between md:hidden">
          <BotaoVoltar className={botaoCapa} />
          <span className="flex gap-2">
            <BotaoCompartilhar titulo={negocio.nome} texto={`Confira ${negocio.nome} no Tanguá App`} url={urlPublica} rotulo="Compartilhar" iconApenas className={botaoCapa} />
            <BotaoFavoritar negocioId={id} initialIsFavorito={isFav} logado={!!user} voltarPara={caminho} className={botaoCapa} />
          </span>
        </div>
      </div>

      <div className="md:mt-6 md:flex md:items-start md:gap-7">
        <div className="flex min-w-0 flex-col md:flex-[999_1_560px] md:gap-6">
          {/* identificação: cartão sobreposto no celular */}
          <div className="relative mx-4 -mt-7 flex flex-col gap-2 rounded-[24px] bg-superficie p-[18px] shadow-[0_8px_24px_rgba(19,36,29,0.08)] md:m-0 md:gap-2.5 md:bg-transparent md:p-0 md:shadow-none">
            <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
              <h1 className="font-display text-[26px] font-bold leading-tight text-barro-900 md:text-[clamp(32px,4vw,48px)] md:leading-none">{negocio.nome}</h1>
              {negocio.verificado && (
                <span className="inline-flex items-center gap-1 rounded-full bg-serra px-2.5 py-0.5 text-xs font-bold text-white md:px-3 md:py-1 md:text-[13px]">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Verificado
                </span>
              )}
              {parceiro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-laranja px-2.5 py-0.5 text-xs font-bold text-tinta md:px-3 md:py-1 md:text-[13px]">
                  <Star className="h-3.5 w-3.5" aria-hidden="true" /> Parceiro Tanguá
                </span>
              )}
              {horario.aberto !== null && (
                <span
                  className={`hidden rounded-full px-3 py-1 text-[13px] font-bold md:inline-flex ${horario.aberto ? 'bg-mata-100 text-mata-700' : 'bg-barro-100 text-barro-700'}`}
                >
                  {horario.rotulo}
                </span>
              )}
            </div>
            {meta && <p className="text-sm text-barro-600 md:text-base">{meta}{!!totalFavoritos && totalFavoritos > 0 && <span className="hidden md:inline"> · {totalFavoritos} {totalFavoritos === 1 ? 'pessoa favoritou' : 'pessoas favoritaram'}</span>}</p>}
            <div className="flex flex-wrap gap-1.5">
              {horario.aberto !== null && (
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold md:hidden ${horario.aberto ? 'bg-mata-100 text-mata-700' : 'bg-barro-100 text-barro-700'}`}>
                  {horario.rotulo}
                </span>
              )}
              {chips.map((c) => (
                <span key={c} className="rounded-full border border-barro-200/80 bg-feira px-2.5 py-1 text-xs font-semibold text-barro-900">
                  {c}
                </span>
              ))}
            </div>
            {negocio.descricao && (
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-barro-800 md:max-w-[720px] md:text-[17px]">{negocio.descricao}</p>
            )}
          </div>

          <div className="flex flex-col gap-4 px-4 pt-4 md:gap-6 md:p-0">
            {cupomAtivo && <CupomBanner cupom={cupomAtivo} logado={!!user} codigoExistente={meuResgate?.codigo ?? null} voltarPara={caminho} linkCompartilhar={`${urlPublica}#oferta`} />}

            {(podePedido || podeAgenda) && (
              <div className="flex flex-col gap-2 md:flex-row">
                {podePedido && (
                  <PedidoWhatsapp
                    negocioId={id}
                    negocio={negocio.nome}
                    whatsapp={zap!}
                    config={negocio.config_pedidos ?? {}}
                    produtos={(produtos ?? []).map((p) => ({ id: p.id, nome: p.nome, precoCentavos: p.preco_a_partir_de ? null : precoCentavos(p.preco) }))}
                  />
                )}
                {podeAgenda && (
                  <AgendaWhatsapp
                    negocioId={id}
                    negocio={negocio.nome}
                    whatsapp={zap!}
                    horario={negocio.horario_funcionamento ?? null}
                    servicos={
                      (produtos ?? []).filter((p) => p.duracao_min).length
                        ? (produtos ?? []).filter((p) => p.duracao_min).map((p) => ({ id: p.id, nome: p.nome, duracao: p.duracao_min as number }))
                        : [{ id: 'atendimento', nome: 'Atendimento', duracao: 30 }]
                    }
                  />
                )}
              </div>
            )}

            {produtos && produtos.length > 0 && (
              <section aria-labelledby="t-catalogo" className="rounded-[22px] border border-barro-200/80 bg-superficie px-4 py-1 md:rounded-[24px] md:px-6 md:py-2">
                <h2 id="t-catalogo" className="mb-1 mt-3 font-display text-lg font-bold text-barro-900 md:mt-4 md:text-[22px]">
                  {autonomo ? 'Serviços e preços' : 'Produtos e preços'}
                </h2>
                <div className="md:grid md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:gap-x-8">
                  {produtos.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 border-b border-barro-100 py-3 last:border-0 md:last:border-b">
                      {p.imagem_url && (
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-barro-100">
                          <Image src={p.imagem_url} alt={p.nome} fill sizes="56px" className="object-cover" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-barro-900">{p.nome}</span>
                        {p.descricao && <span className="line-clamp-2 text-[13px] text-barro-600">{p.descricao}</span>}
                      </span>
                      {p.preco != null && <span className="shrink-0 text-right font-mono font-bold text-mata-700">{formatarPrecoBRL(Number(p.preco), p.preco_a_partir_de)}</span>}
                      <BotaoSalvarProduto produtoId={p.id} nome={p.nome} inicial={salvosIds.has(p.id)} logado={!!user} voltarPara={caminho} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {posts && posts.length > 0 && (
              <section id="novidades" aria-labelledby="t-novidades" className="flex scroll-mt-24 flex-col gap-3">
                <h2 id="t-novidades" className="font-display text-lg font-bold text-barro-900 md:text-[22px]">
                  Novidades
                </h2>
                {posts.map((post) => (
                  <article key={post.id} className="overflow-hidden rounded-[22px] border border-barro-200/80 bg-superficie">
                    {post.imagem_url && (
                      <span className="relative block h-48 w-full">
                        <Image src={post.imagem_url} alt="" fill sizes="(max-width: 768px) 100vw, 720px" className="object-cover" />
                      </span>
                    )}
                    <div className="p-4">
                      <span className="text-xs font-bold uppercase tracking-wide text-mata-700">
                        {post.tipo === 'promocao' ? 'Promoção' : 'Novidade'} ·{' '}
                        {new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(post.criado_em))}
                      </span>
                      <h3 className="mt-1 font-display text-lg font-bold text-barro-900">{post.titulo}</h3>
                      {post.conteudo && <p className="mt-1 whitespace-pre-line text-[15px] text-barro-800">{post.conteudo}</p>}
                    </div>
                  </article>
                ))}
              </section>
            )}

            {negocio.galeria && negocio.galeria.length > 0 && (
              <section aria-labelledby="t-fotos" className="flex flex-col gap-3">
                <h2 id="t-fotos" className="font-display text-lg font-bold text-barro-900 md:text-[22px]">
                  Fotos
                </h2>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-3">
                  {negocio.galeria.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square overflow-hidden rounded-[18px] bg-barro-100">
                      <Image src={url} alt={`Foto de ${negocio.nome}`} fill sizes="(max-width: 768px) 33vw, 200px" className="object-cover" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="md:hidden">{quadroHorario}</div>

            <section aria-labelledby="t-aval" className="flex flex-col gap-3.5 rounded-[24px] border border-barro-200/80 bg-superficie p-5 md:px-6">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="t-aval" className="font-display text-lg font-bold text-barro-900 md:text-[22px]">
                  Avaliações da comunidade
                </h2>
                {nota?.fonte === 'comunidade' && (
                  <span className="flex items-center gap-1 font-mono text-sm font-bold text-casca-700">
                    <Star className="h-4 w-4 fill-current" aria-hidden="true" /> {formatarNota(nota.nota)}
                  </span>
                )}
              </div>
              {user && !eDono && <FormularioAvaliacao negocioId={id} />}
              {!user && (
                <Link href={`/entrar?next=${encodeURIComponent(caminho)}`} className="inline-flex min-h-11 items-center text-sm font-bold text-casca-700 underline">
                  Entre pra avaliar
                </Link>
              )}
              {avaliacoes.length === 0 ? (
                <p className="text-sm text-barro-600">Ninguém avaliou ainda. Já foi lá? Conte como foi.</p>
              ) : (
                <>
                  {avaliacoes.slice(0, 3).map((av) => (
                    <ItemAvaliacao key={av.id} av={av} negocioId={id} logado={!!user} />
                  ))}
                  {avaliacoes.length > 3 && (
                    <details className="group">
                      <summary className="cursor-pointer list-none font-bold text-casca-700 hover:underline">
                        <span className="group-open:hidden">Ver as {avaliacoes.length} avaliações</span>
                        <span className="hidden group-open:inline">Mostrar menos</span>
                      </summary>
                      <div className="mt-3.5 flex flex-col gap-3.5">
                        {avaliacoes.slice(3).map((av) => (
                          <ItemAvaliacao key={av.id} av={av} negocioId={id} logado={!!user} />
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )}
            </section>

            {cartaoFidelidade && (
              <section aria-label="Seu cartão fidelidade" className="rounded-[22px] border border-barro-200/80 bg-superficie p-4">
                <p className="text-sm font-bold text-barro-900">Seu cartão fidelidade</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from({ length: cartaoFidelidade.meta }).map((_, i) => (
                    <span key={i} className={`h-4 w-4 rounded-full ${i < cartaoFidelidade.carimbos ? 'bg-laranja' : 'bg-barro-100'}`} />
                  ))}
                </div>
                <p className="mt-2 text-xs text-barro-600">
                  {cartaoFidelidade.carimbos >= cartaoFidelidade.meta
                    ? 'Completo! Mostre esse cartão pro dono resgatar seu prêmio.'
                    : `${cartaoFidelidade.carimbos}/${cartaoFidelidade.meta} carimbos`}
                </p>
              </section>
            )}

            {!negocio.reivindicado_por && <AvisoNaoReivindicado negocioId={id} nome={negocio.nome} />}
            {eDono && (
              <Link href="/painel/negocio" className="rounded-[18px] bg-mata-100 p-4 text-sm font-semibold text-mata-700">
                Este é o seu negócio. Toque aqui pra editar no painel.
              </Link>
            )}
            <div className="md:hidden">
              <BotaoDenunciar tipoConteudo="negocio" conteudoId={id} negocioId={id} logado={!!user} />
            </div>
          </div>
        </div>

        {/* computador: coluna de contato */}
        <aside aria-label="Contato" className="hidden min-w-0 flex-[1_1_300px] flex-col gap-4 md:sticky md:top-24 md:flex">
          <div className="flex flex-col gap-2.5 rounded-[24px] border border-barro-200/80 bg-superficie p-5">
            {negocio.whatsapp && (
              <BotaoWhatsapp
                negocioId={id}
                whatsapp={negocio.whatsapp}
                mensagem={mensagemWhats}
                className="flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-serra font-bold text-white hover:bg-serra-escuro"
              >
                <MessageCircle className="h-5 w-5" aria-hidden="true" /> Chamar no WhatsApp
              </BotaoWhatsapp>
            )}
            {podeOrcamento && (
              <Link
                href={`/orcamentos/novo?negocio=${id}`}
                className="flex h-12 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-barro-200 font-semibold text-barro-900 hover:bg-barro-50"
              >
                <FileText className="h-4 w-4" aria-hidden="true" /> Pedir orçamento
              </Link>
            )}
            <div className="flex gap-2.5">
              <BotaoFavoritar
                negocioId={id}
                initialIsFavorito={isFav}
                logado={!!user}
                voltarPara={caminho}
                variante="texto"
                className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-barro-200 text-sm font-semibold text-barro-900 hover:bg-barro-50"
              />
              <BotaoCompartilhar
                titulo={negocio.nome}
                texto={`Confira ${negocio.nome} no Tanguá App`}
                url={urlPublica}
                className="h-11 flex-1 rounded-[14px] border-[1.5px] border-barro-200 text-sm text-barro-900 hover:bg-barro-50"
              />
            </div>
          </div>
          {quadroHorario}
          <BotaoDenunciar tipoConteudo="negocio" conteudoId={id} negocioId={id} logado={!!user} />
        </aside>
      </div>

      {/* celular: barra fixa de contato (no lugar da navegação) */}
      {(negocio.whatsapp || podeOrcamento) && (
        <BarraContato>
          {negocio.whatsapp && (
            <BotaoWhatsapp
              negocioId={id}
              whatsapp={negocio.whatsapp}
              mensagem={mensagemWhats}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-serra text-base font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" /> Chamar no WhatsApp
            </BotaoWhatsapp>
          )}
          {podeOrcamento && (
            <Link
              href={`/orcamentos/novo?negocio=${id}`}
              className={`flex h-12 items-center justify-center rounded-2xl border-[1.5px] border-barro-200 px-4 font-semibold text-barro-900 ${negocio.whatsapp ? '' : 'flex-1'}`}
            >
              Orçamento
            </Link>
          )}
        </BarraContato>
      )}
    </div>
  )
}

function ItemAvaliacao({ av, negocioId, logado }: { av: Avaliacao; negocioId: string; logado: boolean }) {
  return (
    <article className="flex flex-col gap-1.5 border-b border-barro-100 pb-3.5 last:border-0 last:pb-0">
      <span className="flex items-center justify-between gap-2">
        <b className="truncate text-barro-900">{av.autor?.nome_completo ?? 'Morador(a)'}</b>
        <span className="shrink-0 font-bold tracking-wider text-casca-700" aria-label={`${av.nota} de 5 estrelas`}>
          {'★'.repeat(av.nota)}
          <span className="text-barro-200">{'★'.repeat(5 - av.nota)}</span>
        </span>
      </span>
      {av.comentario && <p className="text-[15px] text-barro-700">{av.comentario}</p>}
      {av.foto_url && (
        <span className="relative mt-1 block h-40 w-full max-w-xs overflow-hidden rounded-xl bg-barro-100">
          <Image src={av.foto_url} alt="Foto enviada na avaliação" fill sizes="320px" className="object-cover" />
        </span>
      )}
      {av.resposta_profissional && (
        <p className="rounded-xl bg-feira px-3 py-2.5 text-sm text-barro-800">
          <b>Resposta do negócio:</b> {av.resposta_profissional}
        </p>
      )}
      <BotaoDenunciar tipoConteudo="avaliacao" conteudoId={av.id} negocioId={negocioId} logado={logado} />
    </article>
  )
}
