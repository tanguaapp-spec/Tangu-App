import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, comoServico, type Banco } from './harness'

let db: Banco
let dono: string
let negocio: string

const novoNegocio = async (nome: string, donoId: string | null = null) =>
  (
    await db.query<{ id: string }>(
      `insert into public.negocios (nome, reivindicado_por, status_cadastro) values ($1, $2, 'aprovado') returning id`,
      [nome, donoId]
    )
  ).rows[0].id

/** Cadastro self-service: o dono cria pelo app (é o que dispara as cortesias). */
const cadastrarComoDono = (usuario: string, nome: string) =>
  como(db, usuario, (tx) =>
    tx.query<{ id: string }>(
      `insert into public.negocios (nome, reivindicado_por, origem, whatsapp) values ($1, $2, 'cadastro_manual', $3) returning id`,
      [nome, usuario, `2199${Math.floor(1e6 + Math.random() * 8e6)}`]
    )
  ).then((r) => r.rows[0].id)

const plano = (id: string) =>
  db.query<{ p: string }>('select public.plano_efetivo($1) as p', [id]).then((r) => r.rows[0].p)

beforeAll(async () => {
  db = await criarBanco()
  dono = await criarUsuario(db, { papel: 'profissional' })
  negocio = await novoNegocio('Padaria São José', dono)
}, 60_000)

describe('slug', () => {
  it('gera endereço amigável sem acento e único', async () => {
    const outro = await novoNegocio('Padaria São José')
    const { rows } = await db.query<{ id: string; slug: string }>('select id, slug from public.negocios where id = any($1)', [[negocio, outro]])
    const porId = Object.fromEntries(rows.map((r) => [r.id, r.slug]))
    expect(porId[negocio]).toBe('padaria-sao-jose')
    expect(porId[outro]).toBe('padaria-sao-jose-2')
  })

  it('dono não troca o slug pela API', async () => {
    await como(db, dono, (tx) => tx.query(`update public.negocios set slug = 'outro', descricao = 'Pão quente' where id = $1`, [negocio]))
    const { rows } = await db.query<{ slug: string; descricao: string }>('select slug, descricao from public.negocios where id = $1', [negocio])
    expect(rows[0]).toEqual({ slug: 'padaria-sao-jose', descricao: 'Pão quente' })
  })
})

describe('nota média da comunidade', () => {
  it('acompanha inserção e remoção de avaliações', async () => {
    const a = await criarUsuario(db)
    const b = await criarUsuario(db)
    await como(db, a, (tx) => tx.query('insert into public.avaliacoes (negocio_id, autor_id, nota) values ($1, $2, 5)', [negocio, a]))
    await como(db, b, (tx) => tx.query('insert into public.avaliacoes (negocio_id, autor_id, nota) values ($1, $2, 4)', [negocio, b]))
    let { rows } = await db.query<{ nota_media: string; total_avaliacoes: number }>(
      'select nota_media, total_avaliacoes from public.negocios where id = $1',
      [negocio]
    )
    expect(rows[0]).toEqual({ nota_media: '4.5', total_avaliacoes: 2 })
    await db.query('delete from public.avaliacoes where autor_id = $1', [b])
    ;({ rows } = await db.query<{ nota_media: string; total_avaliacoes: number }>('select nota_media, total_avaliacoes from public.negocios where id = $1', [negocio]))
    expect(rows[0]).toEqual({ nota_media: '5.0', total_avaliacoes: 1 })
  })

  it('dono não altera a própria nota', async () => {
    await como(db, dono, (tx) => tx.query('update public.negocios set nota_media = 1, total_avaliacoes = 999 where id = $1', [negocio]))
    const { rows } = await db.query<{ total_avaliacoes: number }>('select total_avaliacoes from public.negocios where id = $1', [negocio])
    expect(rows[0].total_avaliacoes).toBe(1)
  })
})

describe('colaboradores', () => {
  it('membro gerencia catálogo, mas não edita o perfil nem vê a cobrança', async () => {
    const membro = await criarUsuario(db)
    await db.query(`insert into public.membros_negocio (negocio_id, perfil_id, papel) values ($1, $2, 'atendente')`, [negocio, membro])

    await como(db, membro, (tx) =>
      tx.query(`insert into public.produtos_servicos (negocio_id, nome, preco) values ($1, 'Pão francês', 1.2)`, [negocio])
    )
    const { rows: prods } = await db.query('select 1 from public.produtos_servicos where negocio_id = $1', [negocio])
    expect(prods.length).toBeGreaterThan(0)

    await como(db, membro, (tx) => tx.query(`update public.negocios set nome = 'Invadido' where id = $1`, [negocio]))
    const { rows } = await db.query<{ nome: string }>('select nome from public.negocios where id = $1', [negocio])
    expect(rows[0].nome).toBe('Padaria São José')

    await db.query(`insert into public.assinaturas (negocio_id, plano_id, status, valor_centavos) values ($1, 'profissional', 'pendente', 3990)`, [negocio])
    const visiveis = await como(db, membro, (tx) => tx.query('select id from public.assinaturas where negocio_id = $1', [negocio]))
    expect(visiveis.rows).toHaveLength(0)
    const doDono = await como(db, dono, (tx) => tx.query('select id from public.assinaturas where negocio_id = $1', [negocio]))
    expect(doDono.rows).toHaveLength(1)
  })

  it('ninguém se adiciona como membro pela API', async () => {
    const intruso = await criarUsuario(db)
    await expect(
      como(db, intruso, (tx) => tx.query('insert into public.membros_negocio (negocio_id, perfil_id) values ($1, $2)', [negocio, intruso]))
    ).rejects.toThrow(/permission denied/)
  })

  it('e-mail → perfil só pelo servidor', async () => {
    await expect(como(db, dono, (tx) => tx.query(`select public.perfil_id_por_email('x@y.z')`))).rejects.toThrow(/permission denied/)
  })
})

describe('interesse em eventos e favoritos de produto', () => {
  it('cada um vê só os próprios; total é público', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.avisos_cidade (titulo, conteudo, tipo, ativo) values ('Festa da Laranja', 'Na praça', 'evento', true) returning id`
    )
    const evento = rows[0].id
    const a = await criarUsuario(db)
    const b = await criarUsuario(db)
    await como(db, a, (tx) => tx.query('insert into public.interesses_evento (aviso_id, perfil_id) values ($1, $2)', [evento, a]))
    await como(db, b, (tx) => tx.query('insert into public.interesses_evento (aviso_id, perfil_id) values ($1, $2)', [evento, b]))
    await expect(
      como(db, a, (tx) => tx.query('insert into public.interesses_evento (aviso_id, perfil_id) values ($1, $2)', [evento, b]))
    ).rejects.toThrow()
    const meus = await como(db, a, (tx) => tx.query('select * from public.interesses_evento'))
    expect(meus.rows).toHaveLength(1)
    const total = await como(db, null, (tx) => tx.query<{ t: number }>('select public.total_interessados($1) as t', [evento]))
    expect(total.rows[0].t).toBe(2)
  })

  it('lembretes de avaliação são só do servidor', async () => {
    const u = await criarUsuario(db)
    await expect(como(db, u, (tx) => tx.query('select * from public.lembretes_avaliacao'))).rejects.toThrow(/permission denied/)
  })
})

describe('origem das visitas e impressões do destaque', () => {
  it('rejeita origem desconhecida e conta impressões por dia', async () => {
    await expect(
      db.query(`insert into public.eventos_perfil (negocio_id, tipo, origem) values ($1, 'visualizacao', 'hack')`, [negocio])
    ).rejects.toThrow(/eventos_perfil_origem_check/)
    await comoServico(db, (tx) => tx.query('select public.registrar_impressoes($1)', [[negocio]]))
    await comoServico(db, (tx) => tx.query('select public.registrar_impressoes($1)', [[negocio]]))
    const { rows } = await como(db, dono, (tx) => tx.query<{ total: number }>('select total from public.impressoes_destaque where negocio_id = $1', [negocio]))
    expect(rows[0].total).toBe(2)
    const u = await criarUsuario(db)
    await expect(como(db, u, (tx) => tx.query('select public.registrar_impressoes($1)', [[negocio]]))).rejects.toThrow(/permission denied/)
  })
})

describe('origem do cadastro', () => {
  it('guarda a origem higienizada', async () => {
    const u = await criarUsuario(db, { origem: 'qr:balcao<script>' })
    const { rows } = await db.query<{ origem_cadastro: string }>('select origem_cadastro from public.perfis where id = $1', [u])
    expect(rows[0].origem_cadastro).toBe('qr:balcaoscript')
  })
})

describe('cortesias de plano', () => {
  it('negócio novo do app ganha teste grátis (e só uma vez por dono)', async () => {
    const u = await criarUsuario(db, { papel: 'profissional' })
    const primeiro = await cadastrarComoDono(u, 'Barbearia do Zé')
    // plano do teste vem da configuração (0024: Essencial)
    expect(await plano(primeiro)).toBe('essencial')
    // recadastro depois de apagar o negócio não renova o teste
    await db.query(`update public.cortesias_plano set fim = now() - interval '1 second', inicio = now() - interval '2 days' where negocio_id = $1`, [primeiro])
    await db.query('update public.negocios set reivindicado_por = null where id = $1', [primeiro])
    await db.query('update public.negocios set reivindicado_por = $2 where id = $1', [primeiro, u])
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.cortesias_plano where negocio_id = $1`, [primeiro])
    expect(rows[0].n).toBe(1)
    expect(await plano(primeiro)).toBe('gratuito')
  })

  it('negócio importado/criado pelo admin não ganha', async () => {
    const importado = await novoNegocio('Mercado Central')
    expect(await plano(importado)).toBe('gratuito')
  })

  it('quem indicou ganha bônus quando o indicado cadastra o primeiro negócio', async () => {
    const padrinho = await criarUsuario(db, { papel: 'profissional' })
    const negocioPadrinho = await novoNegocio('Loja do Padrinho', padrinho)
    const { rows } = await db.query<{ codigo_convite: string }>('select codigo_convite from public.perfis where id = $1', [padrinho])
    const afilhado = await criarUsuario(db, { papel: 'profissional', codigo_convite: rows[0].codigo_convite })
    await cadastrarComoDono(afilhado, 'Loja do Afilhado')
    expect(await plano(negocioPadrinho)).toBe('essencial')
    const { rows: c } = await db.query('select motivo from public.cortesias_plano where negocio_id = $1', [negocioPadrinho])
    expect(c).toEqual([{ motivo: 'indicacao' }])
  })

  it('cortesia não aparece pra quem não é dono', async () => {
    const u = await criarUsuario(db)
    const { rows } = await como(db, u, (tx) => tx.query('select * from public.cortesias_plano'))
    expect(rows).toHaveLength(0)
  })
})

describe('orçamentos', () => {
  it('colunas novas existem', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name in ('respostas_orcamento','pedidos_orcamento') and column_name in ('vista_em','resposta_escolhida_id')`
    )
    expect(rows.map((r) => r.column_name).sort()).toEqual(['resposta_escolhida_id', 'vista_em'])
  })
})
