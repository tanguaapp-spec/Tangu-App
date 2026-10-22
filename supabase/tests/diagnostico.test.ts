/**
 * Reproduz as falhas encontradas na auditoria contra o schema ATÉ a 0015
 * (estado de produção antes da 0016). Mantido como registro: se alguém
 * reverter a 0016, a suíte seguranca-rls.test.ts quebra; este arquivo
 * documenta como era a brecha.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco

beforeAll(async () => {
  db = await criarBanco({ ate: '0015_prospeccao_google.sql' })
}, 60_000)

describe('estado até a 0015 (antes do endurecimento)', () => {
  it('cadastro público aceitava papel=admin vindo do metadata do signUp', async () => {
    const id = await criarUsuario(db, { papel: 'admin' })
    const { rows } = await db.query<{ papel: string }>('select papel from public.perfis where id = $1', [id])
    expect(rows[0].papel).toBe('admin')
  })

  it('visitante anônimo lia telefone/whatsapp/código de convite de todos os perfis', async () => {
    const id = await criarUsuario(db)
    await db.query(`update public.perfis set telefone = '21999990000' where id = $1`, [id])
    const linhas = await como(db, null, (tx) =>
      tx.query<{ telefone: string }>('select telefone from public.perfis where id = $1', [id])
    )
    expect(linhas.rows[0]?.telefone).toBe('21999990000')
  })

  it('dono do negócio conseguia alterar a NOTA de uma avaliação recebida', async () => {
    const dono = await criarUsuario(db, { papel: 'profissional' })
    const cliente = await criarUsuario(db)
    const { rows } = await db.query<{ id: string }>(
      `insert into public.negocios (nome, reivindicado_por) values ('Loja A', $1) returning id`,
      [dono]
    )
    const negocioId = rows[0].id
    const av = await db.query<{ id: string }>(
      `insert into public.avaliacoes (negocio_id, autor_id, nota) values ($1, $2, 1) returning id`,
      [negocioId, cliente]
    )
    await como(db, dono, (tx) => tx.query('update public.avaliacoes set nota = 5 where id = $1', [av.rows[0].id]))
    const depois = await db.query<{ nota: number }>('select nota from public.avaliacoes where id = $1', [av.rows[0].id])
    expect(depois.rows[0].nota).toBe(5)
  })
})
