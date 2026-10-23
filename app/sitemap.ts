import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/server'
import { ARTIGOS } from '@/lib/ajuda/artigos'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tangua-app.vercel.app').replace(/\/+$/, '')

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/buscar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/ofertas`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/agenda`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.6 },
    { url: `${SITE_URL}/vagas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mural`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/ferramentas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/planos`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/ajuda`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...ARTIGOS.map((a) => ({ url: `${SITE_URL}/ajuda/${a.slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
  ]

  const supabase = createPublicClient()
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

  return [...paginasEstaticas, ...paginasCategorias, ...paginasNegocios]
}
