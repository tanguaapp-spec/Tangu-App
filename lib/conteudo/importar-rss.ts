import { createServiceClient } from '@/lib/supabase/server'
import { lerConfig, moduloAtivo } from '@/lib/config/ler'
import { lerRss, slugNoticia } from './rss'

/**
 * Lê as fontes RSS configuradas e guarda o que é novo como RASCUNHO
 * (com link da fonte). O admin revisa e publica em Admin → Conteúdo.
 * Roda no cron diário.
 */
export async function importarNoticiasRss() {
  if (!(await moduloAtivo('noticias'))) return 0
  const fontes = (await lerConfig('fontes_noticias')) as string[]
  if (!Array.isArray(fontes) || fontes.length === 0) return 0
  const db = createServiceClient()
  let novas = 0
  for (const url of fontes.slice(0, 20)) {
    try {
      const controle = new AbortController()
      const timer = setTimeout(() => controle.abort(), 10_000)
      const resp = await fetch(url, { signal: controle.signal, headers: { 'User-Agent': 'TanguaApp/1.0 (+https://tangua-app.vercel.app)' }, cache: 'no-store' })
      clearTimeout(timer)
      if (!resp.ok) continue
      const xml = (await resp.text()).slice(0, 2_000_000)
      const fonteNome = new URL(url).hostname.replace(/^www\./, '')
      for (const item of lerRss(xml)) {
        const { error } = await db.from('noticias').insert({
          titulo: item.titulo,
          slug: slugNoticia(item.titulo, item.idExterno.replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase() || 'rss'),
          resumo: item.resumo || null,
          corpo: item.resumo,
          fonte_nome: fonteNome,
          fonte_url: item.link,
          status: 'rascunho',
          id_externo: item.idExterno,
          criado_em: item.data ?? new Date().toISOString(),
        })
        if (!error) novas++
      }
    } catch {
      // fonte fora do ar não derruba as outras
    }
  }
  return novas
}
