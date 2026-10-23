import { describe, expect, it } from 'vitest'
import { agruparErros, chaveErro, rotaDoErro, type RegistroErro } from './agrupar-erros'

const r = (o: Partial<RegistroErro>): RegistroErro => ({
  id: crypto.randomUUID(),
  nivel: 'error',
  mensagem: 'x',
  contexto: null,
  stack: null,
  url: null,
  usuario_id: null,
  criado_em: '2026-10-23T10:00:00Z',
  ...o,
})

describe('agrupar erros', () => {
  it('ignora ids e números que mudam', () => {
    expect(chaveErro('Pedido 8f1e2c3a-1111-2222-3333-444455556666 falhou após 3 tentativas')).toBe('Pedido <id> falhou após <n> tentativas')
  })

  it('rota sem domínio e sem id', () => {
    expect(rotaDoErro('https://tangua-app.vercel.app/orcamentos/8f1e2c3a-1111-2222-3333-444455556666?x=1')).toBe('/orcamentos/[id]')
  })

  it('junta ocorrências, conta pessoas e páginas, abertos primeiro', () => {
    const grupos = agruparErros([
      r({ mensagem: 'Falhou 1', url: '/a', usuario_id: 'u1', criado_em: '2026-10-23T10:00:00Z', resolvido_em: '2026-10-23T12:00:00Z' }),
      r({ mensagem: 'Falhou 2', url: '/b', usuario_id: 'u2', criado_em: '2026-10-23T11:00:00Z' }),
      r({ mensagem: 'Outro', criado_em: '2026-10-22T09:00:00Z', resolvido_em: '2026-10-22T10:00:00Z', nota_resolucao: 'ok' }),
    ])
    expect(grupos).toHaveLength(2)
    expect(grupos[0]).toMatchObject({ total: 2, usuarios: 2, urls: ['/a', '/b'], resolvido: false, mensagem: 'Falhou 2' })
    expect(grupos[1]).toMatchObject({ resolvido: true, nota: 'ok' })
  })
})
