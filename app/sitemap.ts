import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const SITE_URL = 'https://tangua-app.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paginasEstaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/buscar`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/vagas`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/mural`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/ferramentas`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  const supabase = createClient()
  const { data: negocios } = await supabase
    .from('negocios')
    .select('id, atualizado_em')
    .eq('ativo', true)
    .eq('status_cadastro', 'aprovado')
    .limit(5000)

  const paginasNegocios: MetadataRoute.Sitemap = (negocios ?? []).map((n) => ({
    url: `${SITE_URL}/negocio/${n.id}`,
    lastModified: n.atualizado_em ? new Date(n.atualizado_em) : new Date(),
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  return [...paginasEstaticas, ...paginasNegocios]
}
