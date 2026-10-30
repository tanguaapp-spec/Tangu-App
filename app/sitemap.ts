import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/server'
import { ARTIGOS } from '@/lib/ajuda/artigos'
import { bairrosComNegocios } from '@/lib/queries/negocios'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tangua-app.vercel.app').replace(/\/+$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/buscar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ofertas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/agenda`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/vagas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mural`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/cidade`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/premios`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/noticias`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${SITE_URL}/servicos-uteis`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${SITE_URL}/mapa`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/ferramentas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/planos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/ajuda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...ARTIGOS.map((a) => ({ url: `${SITE_URL}/ajuda/${a.slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
  ]

  const supabase = createPublicClient()
  // antes da migration 0023 a tabela não existe: só fica sem as notícias
  const { data: noticias } = await supabase.from('noticias').select('slug, atualizado_em').eq('status', 'publicada').limit(2000)
  const paginasNoticias: MetadataRoute.Sitemap = (noticias ?? []).map((n) => ({
    url: `${SITE_URL}/noticias/${n.slug}`,
    lastModified: new Date(n.atualizado_em),
    changeFrequency: 'monthly',
    priority: 0.5,
  }))
  const paginasBairros: MetadataRoute.Sitemap = (await bairrosComNegocios()).map((b) => ({ url: `${SITE_URL}/bairro/${b.slug}`, changeFrequency: 'weekly', priority: 0.6 }))
  const { data: categorias } = await supabase.from('categorias').select('slug')
  const paginasCategorias: MetadataRoute.Sitemap = (categorias ?? []).map((c) => ({
    url: `${SITE_URL}/categoria/${c.slug}`,
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  const { data: negocios } = await supabase
    .from('negocios')
    .select('*')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .limit(5000)

  const paginasNegocios: MetadataRoute.Sitemap = (negocios ?? []).map((n) => ({
    url: `${SITE_URL}/negocio/${n.slug || n.id}`,
    lastModified: n.atualizado_em ? new Date(n.atualizado_em) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...paginasEstaticas, ...paginasCategorias, ...paginasNegocios, ...paginasNoticias, ...paginasBairros]
}
