import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, comoServico, type Banco } from './harness'

let db: Banco
let dono: string
let outro: string
let admin: string

async function cadastrarComo(usuario: string, nome: string) {
  return como(db, usuario, (tx) =>
    tx.query<{ id: string }>(
      `insert into public.negocios (nome, reivindicado_por, origem, whatsapp) values ($1, $2, 'cadastro_manual', '21999990000') returning id`,
      [nome, usuario]
    )
  )
}

beforeAll(async () => {
  db = await criarBanco()
  dono = await criarUsuario(db)
  outro = await criarUsuario(db)
  admin = await criarUsuario(db)
  await db.query('insert into public.administradores_plataforma (perfil_id) values ($1)', [admin])
}, 90_000)

describe('vários negócios por dono', () => {
  it('a mesma conta cadastra mais de um negócio até o limite configurado', async () => {
    await db.query(`update public.configuracoes_sistema set valor = '2' where chave = 'max_negocios_por_dono'`)
    await cadastrarComo(dono, 'Padaria do Centro')
    await cadastrarComo(dono, 'Lanchonete da Praça')
    await expect(cadastrarComo(dono, 'Terceiro Negócio')).rejects.toThrow(/NEGOCIO_DUPLICADO/)
    const { rows } = await db.query('select id from public.negocios where reivindicado_por = $1', [dono])
    expect(rows).toHaveLength(2)
  })
})

describe('horários especiais', () => {
  it('só o dono grava; qualquer um lê', async () => {
    const { rows } = await db.query<{ id: string }>('select id from public.negocios where reivindicado_por = $1 limit 1', [dono])
    const negocio = rows[0].id
    await como(db, dono, (tx) =>
      tx.query(`insert into public.horarios_especiais (negocio_id, data, fechado, motivo) values ($1, '2026-12-25', true, 'Natal')`, [negocio])
    )
    await expect(
      como(db, outro, (tx) => tx.query(`insert into public.horarios_especiais (negocio_id, data, fechado) values ($1, '2026-12-31', true)`, [negocio]))
    ).rejects.toThrow(/row-level security/)
    const lidos = await como(db, null, (tx) => tx.query('select * from public.horarios_especiais'))
    expect(lidos.rows).toHaveLength(1)
  })
})

describe('divulgação paga', () => {
  it('catálogo começa desligado e invisível pro público', async () => {
    const publico = await como(db, null, (tx) => tx.query('select id from public.servicos_pagos'))
    expect(publico.rows).toHaveLength(0)
    const doAdmin = await como(db, admin, (tx) => tx.query('select id from public.servicos_pagos'))
    expect(doAdmin.rows.length).toBeGreaterThanOrEqual(9)
  })

  it('ninguém cria compra direto pela API; só o servidor', async () => {
    await expect(
      como(db, dono, (tx) =>
        tx.query(`insert into public.compras_servicos (servico_id, nome_servico, dias, valor_centavos) values ('banner_home', 'x', 7, 1)`)
      )
    ).rejects.toThrow(/permission denied/)
  })

  it('banner no ar aparece; vencido ou sem arte não', async () => {
    const { rows } = await db.query<{ id: string }>('select id from public.negocios where reivindicado_por = $1 limit 1', [dono])
    await comoServico(db, (tx) =>
      tx.query(
        `insert into public.compras_servicos (servico_id, negocio_id, perfil_id, nome_servico, dias, valor_centavos, status, arte_url, inicia_em, termina_em)
         values ('banner_home', $1, $2, 'Banner', 7, 4990, 'no_ar', 'https://x/arte.webp', now() - interval '1 day', now() + interval '6 days'),
                ('banner_home', $1, $2, 'Banner', 7, 4990, 'no_ar', 'https://x/velho.webp', now() - interval '9 days', now() - interval '2 days'),
                ('banner_home', $1, $2, 'Banner', 7, 4990, 'no_ar', null, now(), now() + interval '6 days')`,
        [rows[0].id, dono]
      )
    )
    const vistos = await como(db, null, (tx) => tx.query<{ arte_url: string; id: string }>(`select * from public.banners_no_ar('banner_home')`))
    expect(vistos.rows.map((r) => r.arte_url)).toEqual(['https://x/arte.webp'])
    await como(db, null, (tx) => tx.query(`select public.contar_banner($1, 'clique')`, [vistos.rows[0].id]))
    const { rows: c } = await db.query<{ cliques: number }>('select cliques from public.compras_servicos where id = $1', [vistos.rows[0].id])
    expect(c[0].cliques).toBe(1)
  })

  it('o dono vê as próprias compras; outra pessoa não', async () => {
    const meus = await como(db, dono, (tx) => tx.query('select id from public.compras_servicos'))
    expect(meus.rows.length).toBe(3)
    const alheios = await como(db, outro, (tx) => tx.query('select id from public.compras_servicos'))
    expect(alheios.rows).toHaveLength(0)
  })
})

describe('dados internos ficam só com o admin', () => {
  it.each(['atividade_diaria', 'respostas_nps', 'leads', 'interacoes_lead', 'investimentos_marketing', 'pedidos_ocultar'])(
    '%s: usuário comum não lê nem grava',
    async (tabela) => {
      const lidos = await como(db, dono, (tx) => tx.query(`select * from public.${tabela}`))
      expect(lidos.rows).toHaveLength(0)
      await expect(como(db, dono, (tx) => tx.query(`delete from public.${tabela}`))).rejects.toThrow(/permission denied/)
    }
  )

  it('notícia em rascunho não aparece pro público', async () => {
    await comoServico(db, (tx) =>
      tx.query(`insert into public.noticias (titulo, slug, status) values ('Obra na praça começa', 'obra-na-praca', 'rascunho'),
                ('Feira de domingo volta', 'feira-de-domingo', 'publicada')`)
    )
    const { rows } = await como(db, null, (tx) => tx.query<{ slug: string }>('select slug from public.noticias'))
    expect(rows.map((r) => r.slug)).toEqual(['feira-de-domingo'])
  })
})

describe('planos novos (0024)', () => {
  it('quatro planos à venda, Profissional fora da vitrine', async () => {
    const { rows } = await como(db, null, (tx) => tx.query<{ id: string; preco_centavos: number }>('select id, preco_centavos from public.planos order by ordem'))
    expect(rows.map((r) => r.id)).toEqual(['gratuito', 'essencial', 'destaque', 'premium'])
    expect(rows.map((r) => r.preco_centavos)).toEqual([0, 3990, 8990, 14990])
  })
})
