import { describe, expect, it } from 'vitest'
import { lerRss, slugNoticia } from './rss'

const RSS = `<?xml version="1.0"?><rss><channel>
<item><title><![CDATA[Vacinação contra gripe começa segunda]]></title><link>https://tangua.rj.gov.br/noticias/vacina</link>
<description>&lt;p&gt;Postos abrem das 8h às 17h.&lt;/p&gt;</description><pubDate>Mon, 02 Nov 2026 10:00:00 -0300</pubDate><guid>vac-1</guid></item>
<item><title>Sem link</title></item>
</channel></rss>`

describe('RSS', () => {
  it('lê título, link, resumo sem HTML, data e id', () => {
    const [i, ...resto] = lerRss(RSS)
    expect(resto).toHaveLength(0)
    expect(i.titulo).toBe('Vacinação contra gripe começa segunda')
    expect(i.resumo).toBe('Postos abrem das 8h às 17h.')
    expect(i.data).toBe('2026-11-02T13:00:00.000Z')
    expect(i.idExterno).toBe('vac-1')
  })

  it('lê Atom', () => {
    const atom = `<feed><entry><title>Obra na praça</title><link href="https://x.gov.br/a"/><id>a1</id><updated>2026-11-01T00:00:00Z</updated></entry></feed>`
    expect(lerRss(atom)[0]).toMatchObject({ titulo: 'Obra na praça', link: 'https://x.gov.br/a', idExterno: 'a1' })
  })

  it('slug sem acento', () => {
    expect(slugNoticia('Vacinação: começa já!', 'ab12')).toBe('vacinacao-comeca-ja-ab12')
  })
})
