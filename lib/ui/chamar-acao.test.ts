import { describe, expect, it } from 'vitest'
import { chamarAcao, SEM_RESPOSTA } from './chamar-acao'

describe('chamarAcao', () => {
  it('devolve a resposta da ação', async () => {
    expect(await chamarAcao(Promise.resolve({ ok: true }))).toEqual({ ok: true })
  })

  it('resposta vazia vira erro amigável', async () => {
    expect(await chamarAcao(Promise.resolve(undefined))).toEqual({ erro: SEM_RESPOSTA })
  })

  it('falha no caminho vira erro amigável', async () => {
    expect(await chamarAcao(Promise.reject(new Error('rede')))).toEqual({ erro: SEM_RESPOSTA })
  })

  it('ação que redireciona: resposta vazia é sucesso, sem erro', async () => {
    const r = await chamarAcao<{ erro?: string } | undefined>(Promise.resolve(undefined), { redireciona: true })
    expect(r?.erro).toBeUndefined()
  })

  it('ação que redireciona ainda mostra o erro que ela devolve', async () => {
    expect(await chamarAcao(Promise.resolve({ erro: 'E-mail ou senha incorretos.' }), { redireciona: true })).toEqual({ erro: 'E-mail ou senha incorretos.' })
  })
})
