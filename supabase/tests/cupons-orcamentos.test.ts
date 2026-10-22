import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco
let dono: string
let outroDono: string
let negocio: string
let outroNegocio: string

const amanha = () => new Date(Date.now() + 86400e3).toISOString()

async function novoCupom(campos: Record<string, unknown> = {}) {
  const base = { negocio_id: negocio, titulo: 'Corte', desconto_texto: '20%', expira_em: amanha(), ...campos }
  const cols = Object.keys(base)
  const { rows } = await db.query<{ id: string }>(
    `insert into public.cupons (${cols.join(',')}) values (${cols.map((_, i) => `$${i + 1}`).join(',')}) returning id`,
    Object.values(base)
  )
  return rows[0].id
}

const resgatar = (usuario: string, cupom: string) =>
  como(db, usuario, (tx) => tx.query<{ codigo: string }>('select public.resgatar_cupom($1) as codigo', [cupom])).then((r) => r.rows[0].codigo)

beforeAll(async () => {
  db = await criarBanco()
  dono = await criarUsuario(db, { papel: 'profissional' })
  outroDono = await criarUsuario(db, { papel: 'profissional' })
  negocio = (await db.query<{ id: string }>(`insert into public.negocios (nome, reivindicado_por, status_cadastro) values ('Salão', $1, 'aprovado') returning id`, [dono])).rows[0].id
  outroNegocio = (
    await db.query<{ id: string }>(`insert into public.negocios (nome, reivindicado_por, status_cadastro) values ('Oficina', $1, 'aprovado') returning id`, [outroDono])
  ).rows[0].id
}, 60_000)

describe('resgate de cupom', () => {
  it('gera código de 8 caracteres e repetir devolve o mesmo (idempotente)', async () => {
    const cupom = await novoCupom()
    const u = await criarUsuario(db)
    const c1 = await resgatar(u, cupom)
    const c2 = await resgatar(u, cupom)
    expect(c1).toMatch(/^[A-HJ-NP-Z2-9]{8}$/)
    expect(c2).toBe(c1)
    const { rows } = await db.query<{ resgates_count: number }>('select resgates_count from public.cupons where id = $1', [cupom])
    expect(rows[0].resgates_count).toBe(1)
  })

  it('respeita o limite de resgates', async () => {
    const cupom = await novoCupom({ limite_resgates: 2 })
    await resgatar(await criarUsuario(db), cupom)
    await resgatar(await criarUsuario(db), cupom)
    await expect(resgatar(await criarUsuario(db), cupom)).rejects.toThrow(/CUPOM:esgotado/)
  })

  it('cupom agendado, expirado ou suspenso não resgata', async () => {
    const u = await criarUsuario(db)
    const futuro = await novoCupom({ inicia_em: amanha(), expira_em: new Date(Date.now() + 2 * 86400e3).toISOString() })
    await expect(resgatar(u, futuro)).rejects.toThrow(/CUPOM:agendado/)
    const suspenso = await novoCupom({ ativo: false })
    await expect(resgatar(u, suspenso)).rejects.toThrow(/CUPOM:indisponivel/)
  })

  it('dono não resgata o próprio cupom', async () => {
    const cupom = await novoCupom()
    await expect(resgatar(dono, cupom)).rejects.toThrow(/CUPOM:proprio/)
  })

  it('anônimo não resgata', async () => {
    const cupom = await novoCupom()
    await expect(como(db, null, (tx) => tx.query('select public.resgatar_cupom($1)', [cupom]))).rejects.toThrow(/permission denied/)
  })

  it('ninguém infla o contador nem cria resgate pela API', async () => {
    const cupom = await novoCupom({ limite_resgates: 1 })
    await resgatar(await criarUsuario(db), cupom)
    // dono tenta zerar o contador pra "liberar" mais resgates além do limite
    await como(db, dono, (tx) => tx.query('update public.cupons set resgates_count = 0, titulo = $2 where id = $1', [cupom, 'Corte!']))
    const { rows } = await db.query<{ resgates_count: number; titulo: string }>('select resgates_count, titulo from public.cupons where id = $1', [cupom])
    expect(rows[0]).toEqual({ resgates_count: 1, titulo: 'Corte!' })
    const u = await criarUsuario(db)
    await expect(
      como(db, u, (tx) => tx.query(`insert into public.cupom_resgates (cupom_id, perfil_id, codigo) values ($1, $2, 'XXXXXXXX')`, [cupom, u]))
    ).rejects.toThrow(/permission denied/)
  })

  it('preço promocional precisa ser menor que o original', async () => {
    await expect(novoCupom({ preco_original_centavos: 5000, preco_promocional_centavos: 6000 })).rejects.toThrow(/cupons_precos_coerentes/)
    await expect(novoCupom({ preco_original_centavos: 5000 })).rejects.toThrow(/cupons_precos_coerentes/)
  })

  it('validação no balcão: uso único e só pelo dono do negócio', async () => {
    const cupom = await novoCupom()
    const codigo = await resgatar(await criarUsuario(db), cupom)
    const intruso = await como(db, outroDono, (tx) => tx.query<{ r: any }>('select public.validar_codigo_cupom($1) r', [codigo]))
    expect(intruso.rows[0].r.resultado).toBe('inexistente')
    const ok = await como(db, dono, (tx) => tx.query<{ r: any }>('select public.validar_codigo_cupom($1) r', [codigo.toLowerCase()]))
    expect(ok.rows[0].r.resultado).toBe('ok')
    const denovo = await como(db, dono, (tx) => tx.query<{ r: any }>('select public.validar_codigo_cupom($1) r', [codigo]))
    expect(denovo.rows[0].r.resultado).toBe('ja_usado')
  })
})

describe('pedidos de orçamento', () => {
  let morador: string
  let pedido: string

  beforeAll(async () => {
    morador = await criarUsuario(db)
    pedido = (
      await como(db, morador, (tx) =>
        tx.query<{ id: string }>(
          `insert into public.pedidos_orcamento (solicitante_id, titulo, descricao, bairro) values ($1, 'Pintar sala', 'Sala de 20m², parede com mofo', 'Centro') returning id`,
          [morador]
        )
      )
    ).rows[0].id
    // destinatários são gravados pelo servidor (service role)
    await db.query('insert into public.pedido_destinatarios (pedido_id, negocio_id) values ($1, $2)', [pedido, negocio])
  })

  it('só o negócio destinatário enxerga o pedido', async () => {
    const vê = await como(db, dono, (tx) => tx.query('select id from public.pedidos_orcamento where id = $1', [pedido]))
    expect(vê.rows).toHaveLength(1)
    const naoVe = await como(db, outroDono, (tx) => tx.query('select id from public.pedidos_orcamento where id = $1', [pedido]))
    expect(naoVe.rows).toHaveLength(0)
  })

  it('negócio não destinatário não responde', async () => {
    await expect(
      como(db, outroDono, (tx) =>
        tx.query(`insert into public.respostas_orcamento (pedido_id, negocio_id, mensagem) values ($1, $2, 'faço barato')`, [pedido, outroNegocio])
      )
    ).rejects.toThrow(/row-level security/)
  })

  it('destinatário responde; morador vê; outro negócio não vê', async () => {
    await como(db, dono, (tx) =>
      tx.query(`insert into public.respostas_orcamento (pedido_id, negocio_id, mensagem, valor_centavos) values ($1, $2, 'Faço por 450', 45000)`, [pedido, negocio])
    )
    const m = await como(db, morador, (tx) => tx.query('select mensagem from public.respostas_orcamento where pedido_id = $1', [pedido]))
    expect(m.rows).toHaveLength(1)
    const o = await como(db, outroDono, (tx) => tx.query('select mensagem from public.respostas_orcamento where pedido_id = $1', [pedido]))
    expect(o.rows).toHaveLength(0)
  })

  it('morador não se adiciona destinatários nem encerra pedido alheio pela API', async () => {
    await expect(
      como(db, morador, (tx) => tx.query('insert into public.pedido_destinatarios (pedido_id, negocio_id) values ($1, $2)', [pedido, outroNegocio]))
    ).rejects.toThrow(/permission denied/)
    await expect(como(db, dono, (tx) => tx.query(`update public.pedidos_orcamento set status = 'encerrado' where id = $1`, [pedido]))).rejects.toThrow(
      /permission denied/
    )
  })

  it('pedido encerrado não aceita resposta', async () => {
    await db.query(`update public.pedidos_orcamento set status = 'encerrado' where id = $1`, [pedido])
    await expect(
      como(db, dono, (tx) => tx.query(`insert into public.respostas_orcamento (pedido_id, negocio_id, mensagem) values ($1, $2, 'oi')`, [pedido, negocio]))
    ).rejects.toThrow(/row-level security/)
  })
})
