import { describe, expect, it } from 'vitest'
import { emailConfigurado, montarEmail } from './enviar'

describe('e-mail', () => {
  it('escapa o texto do usuário', () => {
    const html = montarEmail({ titulo: '<script>x</script>', texto: 'a & b', botao: 'Ver', url: 'https://x/"y' })
    expect(html).not.toContain('<script>x')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('a &amp; b')
    expect(html).toContain('https://x/&quot;y')
  })
  it('sem chave fica desligado', () => {
    delete process.env.RESEND_API_KEY
    expect(emailConfigurado()).toBe(false)
  })
})
