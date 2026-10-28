/**
 * Leitor mínimo de RSS/Atom (sem dependência): só título, link, data,
 * resumo e id. O texto vira rascunho para revisão humana; nada é publicado
 * sozinho e o link da fonte original sempre acompanha.
 */

export type ItemRss = { titulo: string; link: string; resumo: string; data: string | null; idExterno: string }

function decodificar(texto: string) {
  return texto
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    // descrição costuma vir com HTML "escapado": tira as tags de novo depois de decodificar
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function campo(bloco: string, ...tags: string[]) {
  for (const tag of tags) {
    const m = bloco.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'))
    if (m) return m[1]
  }
  return ''
}

export function lerRss(xml: string, limite = 15): ItemRss[] {
  const blocos = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  const itens: ItemRss[] = []
  for (const b of blocos.slice(0, limite)) {
    const titulo = decodificar(campo(b, 'title')).slice(0, 160)
    let link = decodificar(campo(b, 'link'))
    if (!link) link = b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? ''
    if (!titulo || !/^https?:\/\//.test(link)) continue
    const resumo = decodificar(campo(b, 'description', 'summary', 'content')).slice(0, 280)
    const dataBruta = decodificar(campo(b, 'pubDate', 'published', 'updated', 'dc:date'))
    const data = dataBruta && !Number.isNaN(new Date(dataBruta).getTime()) ? new Date(dataBruta).toISOString() : null
    const idExterno = (decodificar(campo(b, 'guid', 'id')) || link).slice(0, 300)
    itens.push({ titulo, link, resumo, data, idExterno })
  }
  return itens
}

export function slugNoticia(titulo: string, sufixo: string) {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
  return `${base || 'noticia'}-${sufixo}`.slice(0, 120)
}
