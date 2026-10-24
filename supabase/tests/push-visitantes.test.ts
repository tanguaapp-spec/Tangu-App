import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, comoServico, type Banco } from './harness'

let db: Banco
let usuario: string

beforeAll(async () => {
  db = await criarBanco()
  usuario = await criarUsuario(db)
}, 60_000)

const linha = (endpoint: string, perfil: string | null) =>
  db.query(`insert into public.push_subscriptions (perfil_id, endpoint, p256dh, auth) values ($1, $2, 'k', 'a')`, [perfil, endpoint])

describe('notificações de visitante', () => {
  it('servidor grava inscrição sem perfil', async () => {
    await comoServico(db, () => linha('https://fcm.googleapis.com/fcm/send/visitante-1', null))
    const { rows } = await db.query('select perfil_id from public.push_subscriptions where endpoint like $1', ['%visitante-1'])
    expect(rows).toEqual([{ perfil_id: null }])
  })

  it('ninguém grava nem apaga inscrição pela API pública', async () => {
    await expect(
      como(db, null, (tx) => tx.query(`insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://x/y', 'k', 'a')`))
    ).rejects.toThrow(/permission denied/)
    await expect(
      como(db, usuario, (tx) => tx.query(`insert into public.push_subscriptions (perfil_id, endpoint, p256dh, auth) values ($1, 'https://x/z', 'k', 'a')`, [usuario]))
    ).rejects.toThrow(/permission denied/)
    await expect(como(db, usuario, (tx) => tx.query('delete from public.push_subscriptions'))).rejects.toThrow(/permission denied/)
  })

  it('cada pessoa só lê as próprias; visitante anônimo não lê nenhuma', async () => {
    await linha('https://fcm.googleapis.com/fcm/send/do-usuario', usuario)
    const minhas = await como(db, usuario, (tx) => tx.query('select endpoint from public.push_subscriptions'))
    expect(minhas.rows).toHaveLength(1)
    const anonimas = await como(db, null, (tx) => tx.query('select endpoint from public.push_subscriptions'))
    expect(anonimas.rows).toHaveLength(0)
  })
})
