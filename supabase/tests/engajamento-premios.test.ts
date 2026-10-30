import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, comoServico, type Banco } from './harness'

let db: Banco
let padrinho: string
let codigo: string
let admin: string

const inicio = '2000-01-01T00:00:00Z'
const fim = '2100-01-01T00:00:00Z'

async function pontos(perfil: string, motivo?: string) {
  const { rows } = await db.query<{ total: number }>(
    `select coalesce(sum(quantidade), 0)::int as total from public.pontos_laranjas where perfil_id = $1 ${motivo ? 'and motivo = $2' : ''}`,
    motivo ? [perfil, motivo] : [perfil]
  )
  return rows[0].total
}

async function indicado(confirmado: boolean) {
  const { rows } = await db.query<{ id: string }>(
    `insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at)
     values (gen_random_uuid(), $1, $2, ${confirmado ? 'now()' : 'null'}) returning id`,
    [`v${Math.random().toString(36).slice(2)}@teste.local`, JSON.stringify({ nome_completo: 'Vizinho', codigo_convite: codigo })]
  )
  return rows[0].id
}

beforeAll(async () => {
  db = await criarBanco()
  padrinho = await criarUsuario(db, { nome_completo: 'Ana Padrinho' })
  admin = await criarUsuario(db)
  await db.query('insert into public.administradores_plataforma (perfil_id) values ($1)', [admin])
  const { rows } = await db.query<{ codigo_convite: string }>('select codigo_convite from public.perfis where id = $1', [padrinho])
  codigo = rows[0].codigo_convite
}, 90_000)

describe('0029: Laranjas sem brecha', () => {
  it('indicação só vale quando o vizinho confirma o e-mail, e uma vez só', async () => {
    const vizinho = await indicado(false)
    expect(await pontos(padrinho, 'indicacao')).toBe(0)

    await db.query('update auth.users set email_confirmed_at = now() where id = $1', [vizinho])
    expect(await pontos(padrinho, 'indicacao')).toBe(20)

    // confirmar de novo (ou outra atualização) não soma outra vez
    await db.query(`update auth.users set email_confirmed_at = now() + interval '1 minute' where id = $1`, [vizinho])
    expect(await pontos(padrinho, 'indicacao')).toBe(20)

    // conta já criada confirmada também conta
    await indicado(true)
    expect(await pontos(padrinho, 'indicacao')).toBe(40)
  })

  it('o mesmo ponto com a mesma referência não entra duas vezes', async () => {
    const negocio = '11111111-1111-1111-1111-111111111111'
    await comoServico(db, (tx) => tx.query(`insert into public.pontos_laranjas (perfil_id, quantidade, motivo, referencia) values ($1, 2, 'favorito', $2)`, [padrinho, negocio]))
    await expect(
      comoServico(db, (tx) => tx.query(`insert into public.pontos_laranjas (perfil_id, quantidade, motivo, referencia) values ($1, 2, 'favorito', $2)`, [padrinho, negocio]))
    ).rejects.toThrow(/duplicate key/)
    expect(await pontos(padrinho, 'favorito')).toBe(2)
  })
})

describe('0029: ranking e selos', () => {
  it('ranking soma o período, ordena por Laranjas e só o servidor chama', async () => {
    const { rows } = await comoServico(db, (tx) =>
      tx.query<{ perfil_id: string; nome: string; laranjas: string; indicacoes: string }>('select * from public.ranking_engajamento($1, $2, 10)', [inicio, fim])
    )
    const ana = rows.find((r) => r.perfil_id === padrinho)
    expect(ana?.nome).toBe('Ana Padrinho')
    expect(Number(ana?.indicacoes)).toBe(2)
    expect(Number(rows[0].laranjas)).toBeGreaterThanOrEqual(Number(rows[rows.length - 1].laranjas))
    await expect(como(db, padrinho, (tx) => tx.query('select * from public.ranking_engajamento($1, $2, 10)', [inicio, fim]))).rejects.toThrow(/permission denied/)
  })

  it('período sem nada devolve vazio', async () => {
    const { rows } = await comoServico(db, (tx) => tx.query('select * from public.ranking_engajamento($1, $2, 10)', ['1990-01-01T00:00:00Z', '1990-02-01T00:00:00Z']))
    expect(rows).toHaveLength(0)
  })

  it('contagens de selo são públicas (só números)', async () => {
    const { rows } = await como(db, null, (tx) => tx.query<{ avaliacoes: string; favoritos: string }>('select * from public.contagens_selos($1::uuid[])', [[padrinho]]))
    expect(rows).toHaveLength(1)
    expect(Number(rows[0].avaliacoes)).toBe(0)
  })
})

describe('0029: prêmios', () => {
  it('morador vê só prêmio visível e só os próprios prêmios ganhos; ninguém grava pela API', async () => {
    const { rows } = await comoServico(db, (tx) =>
      tx.query<{ id: string }>(`insert into public.premios (titulo, parceiro) values ('Corte grátis', 'Barbearia'), ('Escondido', 'X') returning id`)
    )
    const [visivel, escondido] = rows.map((r) => r.id)
    await comoServico(db, (tx) => tx.query('update public.premios set ativo = false where id = $1', [escondido]))
    await comoServico(db, (tx) => tx.query(`insert into public.premios_ganhadores (premio_id, perfil_id, mes) values ($1, $2, '2026-10-01')`, [visivel, padrinho]))

    const publicos = await como(db, null, (tx) => tx.query<{ id: string }>('select id from public.premios'))
    expect(publicos.rows.map((r) => r.id)).toEqual([visivel])

    const outro = await criarUsuario(db)
    const meus = await como(db, padrinho, (tx) => tx.query('select id from public.premios_ganhadores'))
    const deOutro = await como(db, outro, (tx) => tx.query('select id from public.premios_ganhadores'))
    expect(meus.rows).toHaveLength(1)
    expect(deOutro.rows).toHaveLength(0)

    const doAdmin = await como(db, admin, (tx) => tx.query('select id from public.premios'))
    expect(doAdmin.rows).toHaveLength(2)

    await expect(como(db, padrinho, (tx) => tx.query(`insert into public.premios (titulo, parceiro) values ('Golpe', 'x')`))).rejects.toThrow(/permission denied/)
    await expect(
      como(db, padrinho, (tx) => tx.query(`insert into public.premios_ganhadores (premio_id, perfil_id, mes) values ($1, $2, '2026-11-01')`, [visivel, padrinho]))
    ).rejects.toThrow(/permission denied/)
  })

  it('o mesmo prêmio não vai duas vezes para a mesma pessoa no mesmo mês', async () => {
    const { rows } = await db.query<{ premio_id: string }>('select premio_id from public.premios_ganhadores limit 1')
    await expect(
      comoServico(db, (tx) => tx.query(`insert into public.premios_ganhadores (premio_id, perfil_id, mes) values ($1, $2, '2026-10-01')`, [rows[0].premio_id, padrinho]))
    ).rejects.toThrow(/duplicate key/)
  })
})
