import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, comoServico, type Banco } from './harness'

let db: Banco
let pessoa: string
let email: string

beforeAll(async () => {
  db = await criarBanco()
  pessoa = await criarUsuario(db)
  const { rows } = await db.query<{ email: string }>('select email from auth.users where id = $1', [pessoa])
  email = rows[0].email
}, 90_000)

describe('0028: acesso pelo WhatsApp', () => {
  it('o servidor acha a conta pelo e-mail (sem diferenciar maiúsculas)', async () => {
    const { rows } = await comoServico(db, (tx) => tx.query<{ id: string }>('select public.perfil_id_por_email($1) as id', [`  ${email.toUpperCase()} `]))
    expect(rows[0].id).toBe(pessoa)
  })

  it('ninguém de fora descobre conta por e-mail', async () => {
    await expect(como(db, null, (tx) => tx.query('select public.perfil_id_por_email($1)', [email]))).rejects.toThrow(/permission denied/)
    await expect(como(db, pessoa, (tx) => tx.query('select public.perfil_id_por_email($1)', [email]))).rejects.toThrow(/permission denied/)
  })

  it('a fila é só do servidor e não duplica pedido aberto', async () => {
    await comoServico(db, (tx) => tx.query('insert into public.pedidos_acesso (perfil_id) values ($1)', [pessoa]))
    await expect(comoServico(db, (tx) => tx.query('insert into public.pedidos_acesso (perfil_id) values ($1)', [pessoa]))).rejects.toThrow(/duplicate key/)
    await expect(como(db, pessoa, (tx) => tx.query('select * from public.pedidos_acesso'))).rejects.toThrow(/permission denied/)
    await expect(como(db, pessoa, (tx) => tx.query('insert into public.pedidos_acesso (perfil_id) values ($1)', [pessoa]))).rejects.toThrow(/permission denied/)
    // depois de enviado, um novo pedido pode entrar
    await comoServico(db, (tx) => tx.query(`update public.pedidos_acesso set status = 'enviado' where perfil_id = $1`, [pessoa]))
    await comoServico(db, (tx) => tx.query('insert into public.pedidos_acesso (perfil_id) values ($1)', [pessoa]))
  })
})
