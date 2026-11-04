import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco
let dono: string
let outro: string

const cadastrar = (usuario: string, nome: string) =>
  como(db, usuario, (tx) =>
    tx.query<{ id: string; status_cadastro: string; motivo_moderacao: string | null }>(
      `insert into public.negocios (nome, reivindicado_por, origem, whatsapp) values ($1, $2, 'cadastro_manual', '21999990000')
       returning id, status_cadastro, motivo_moderacao`,
      [nome, usuario]
    )
  )

beforeAll(async () => {
  db = await criarBanco()
  dono = await criarUsuario(db)
  outro = await criarUsuario(db)
}, 90_000)

describe('0030: negócio repetido não entra', () => {
  it('normaliza o nome como o app', async () => {
    const { rows } = await db.query<{ n: string }>(`select public.normalizar_nome('  Máx Gym — Academia! ') as n`)
    expect(rows[0].n).toBe('max gym academia')
  })

  it('a mesma conta não cadastra o mesmo negócio duas vezes', async () => {
    const { rows } = await cadastrar(dono, 'Max Gym Academia')
    expect(rows[0].status_cadastro).toBe('aprovado')
    await expect(cadastrar(dono, 'max gym  academia.')).rejects.toThrow(/NEGOCIO_REPETIDO/)
    // outro negócio, com outro nome, continua permitido
    const outroNegocio = await cadastrar(dono, 'Max Suplementos')
    expect(outroNegocio.rows[0].status_cadastro).toBe('aprovado')
  })

  it('nome igual ao de outra pessoa entra para revisão', async () => {
    const { rows } = await cadastrar(outro, 'MAX GYM ACADEMIA')
    expect(rows[0].status_cadastro).toBe('pendente')
    expect(rows[0].motivo_moderacao).toMatch(/Possível repetido/)
  })
})
