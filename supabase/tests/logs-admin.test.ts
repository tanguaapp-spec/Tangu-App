import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco
let admin: string
let comum: string

beforeAll(async () => {
  db = await criarBanco()
  admin = await criarUsuario(db)
  comum = await criarUsuario(db)
  // admin de verdade (0016): tabela administradores_plataforma, papel continua "morador"
  await db.query('insert into public.administradores_plataforma (perfil_id) values ($1)', [admin])
  await db.query(`insert into public.error_logs (mensagem, contexto) values ('Falhou X', 'teste')`)
}, 60_000)

describe('central de erros', () => {
  it('admin da tabela administradores_plataforma lê os logs', async () => {
    const { rows } = await como(db, admin, (tx) => tx.query('select mensagem from public.error_logs'))
    expect(rows).toHaveLength(1)
  })

  it('usuário comum não lê nem resolve', async () => {
    const { rows } = await como(db, comum, (tx) => tx.query('select * from public.error_logs'))
    expect(rows).toHaveLength(0)
    await expect(como(db, comum, (tx) => tx.query('update public.error_logs set resolvido_em = now()'))).rejects.toThrow(/permission denied/)
  })

  it('colunas de resolução existem', async () => {
    await db.query(`update public.error_logs set resolvido_em = now(), nota_resolucao = 'corrigido no deploy'`)
    const { rows } = await db.query<{ nota_resolucao: string }>('select nota_resolucao from public.error_logs')
    expect(rows[0].nota_resolucao).toBe('corrigido no deploy')
  })
})
