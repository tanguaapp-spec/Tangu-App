import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco

beforeAll(async () => {
  db = await criarBanco()
}, 60_000)

async function novoDonoComNegocio(nome = 'Negócio') {
  const dono = await criarUsuario(db, { papel: 'profissional' })
  const { rows } = await db.query<{ id: string }>(
    `insert into public.negocios (nome, reivindicado_por, status_cadastro) values ($1, $2, 'aprovado') returning id`,
    [nome, dono]
  )
  return { dono, negocio: rows[0].id }
}

async function assinar(negocio: string, plano: string, campos: Record<string, string | null>) {
  const colunas = ['negocio_id', 'plano_id', 'valor_centavos', ...Object.keys(campos)]
  const valores = [negocio, plano, 3990, ...Object.values(campos)]
  const marcadores = valores.map((_, i) => `$${i + 1}`)
  await db.query(`insert into public.assinaturas (${colunas.join(',')}) values (${marcadores.join(',')})`, valores)
}

async function planoDe(negocio: string) {
  const { rows } = await db.query<{ p: string }>('select public.plano_efetivo($1) as p', [negocio])
  return rows[0].p
}

describe('plano efetivo', () => {
  it('sem assinatura = gratuito', async () => {
    const { negocio } = await novoDonoComNegocio()
    expect(await planoDe(negocio)).toBe('gratuito')
  })

  it('pendente (voltou do checkout mas não pagou) continua gratuito', async () => {
    const { negocio } = await novoDonoComNegocio()
    await assinar(negocio, 'profissional', { status: 'pendente' })
    expect(await planoDe(negocio)).toBe('gratuito')
  })

  it('ativa dentro do período = plano pago', async () => {
    const { negocio } = await novoDonoComNegocio()
    await assinar(negocio, 'profissional', { status: 'ativa', periodo_atual_fim: new Date(Date.now() + 86400e3 * 20).toISOString() })
    expect(await planoDe(negocio)).toBe('profissional')
  })

  it('em atraso: vale durante a tolerância, cai depois', async () => {
    const a = await novoDonoComNegocio()
    await assinar(a.negocio, 'destaque', { status: 'em_atraso', tolerancia_ate: new Date(Date.now() + 86400e3).toISOString() })
    expect(await planoDe(a.negocio)).toBe('destaque')

    const b = await novoDonoComNegocio()
    await assinar(b.negocio, 'destaque', { status: 'em_atraso', tolerancia_ate: new Date(Date.now() - 1000).toISOString() })
    expect(await planoDe(b.negocio)).toBe('gratuito')
  })

  it('cancelada vale até o fim do período já pago', async () => {
    const a = await novoDonoComNegocio()
    await assinar(a.negocio, 'profissional', { status: 'cancelada', periodo_atual_fim: new Date(Date.now() + 86400e3).toISOString() })
    expect(await planoDe(a.negocio)).toBe('profissional')
    const b = await novoDonoComNegocio()
    await assinar(b.negocio, 'profissional', { status: 'cancelada', periodo_atual_fim: new Date(Date.now() - 1000).toISOString() })
    expect(await planoDe(b.negocio)).toBe('gratuito')
  })

  it('só uma assinatura aberta por negócio', async () => {
    const { negocio } = await novoDonoComNegocio()
    await assinar(negocio, 'profissional', { status: 'pendente' })
    await expect(assinar(negocio, 'destaque', { status: 'pendente' })).rejects.toThrow(/duplicate|unique/i)
  })
})

describe('limites aplicados pelo banco', () => {
  it('gratuito: 6º produto ativo é recusado (0024: limite 5)', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    await como(db, dono, async (tx) => {
      for (let i = 0; i < 5; i++) {
        await tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, $2)`, [negocio, `p${i}`])
      }
    })
    await expect(
      como(db, dono, (tx) => tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, 'p10')`, [negocio]))
    ).rejects.toThrow(/LIMITE_PLANO:max_produtos/)
  })

  it('não dá pra burlar reativando item arquivado', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    await db.query(`insert into public.produtos_servicos (negocio_id, nome, ativo) values ($1, 'arquivado', false)`, [negocio])
    await como(db, dono, async (tx) => {
      for (let i = 0; i < 5; i++) {
        await tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, $2)`, [negocio, `p${i}`])
      }
    })
    await expect(
      como(db, dono, (tx) => tx.query(`update public.produtos_servicos set ativo = true where negocio_id = $1 and not ativo`, [negocio]))
    ).rejects.toThrow(/LIMITE_PLANO/)
  })

  it('plano pago libera mais itens', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    await assinar(negocio, 'profissional', { status: 'ativa', periodo_atual_fim: new Date(Date.now() + 86400e3).toISOString() })
    await como(db, dono, async (tx) => {
      for (let i = 0; i < 11; i++) {
        await tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, $2)`, [negocio, `p${i}`])
      }
    })
    const { rows } = await db.query<{ n: number }>('select count(*)::int n from public.produtos_servicos where negocio_id = $1', [negocio])
    expect(rows[0].n).toBe(11)
  })

  it('gratuito: 2º cupom ativo recusado', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    const amanha = new Date(Date.now() + 86400e3).toISOString()
    const inserir = () =>
      como(db, dono, (tx) =>
        tx.query(`insert into public.cupons (negocio_id, titulo, desconto_texto, expira_em) values ($1,'x','10%',$2)`, [negocio, amanha])
      )
    await inserir()
    await expect(inserir()).rejects.toThrow(/LIMITE_PLANO:max_cupons_ativos/)
  })

  it('gratuito: galeria não passa de 5 fotos', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    const fotos = (n: number) => JSON.stringify(Array.from({ length: n }, (_, i) => `https://x/${i}.jpg`))
    await como(db, dono, (tx) => tx.query(`update public.negocios set galeria = $1::jsonb where id = $2`, [fotos(5), negocio]))
    await expect(
      como(db, dono, (tx) => tx.query(`update public.negocios set galeria = $1::jsonb where id = $2`, [fotos(6), negocio]))
    ).rejects.toThrow(/LIMITE_PLANO:max_fotos_galeria/)
  })

  it('uso_plano: dono vê, outro usuário não', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    const r = await como(db, dono, (tx) => tx.query<{ u: any }>('select public.uso_plano($1) as u', [negocio]))
    expect(r.rows[0].u.plano).toBe('gratuito')
    expect(r.rows[0].u.limites.max_produtos).toEqual({ limite: 5, uso: 0 })
    const intruso = await criarUsuario(db)
    await expect(como(db, intruso, (tx) => tx.query('select public.uso_plano($1)', [negocio]))).rejects.toThrow(/acesso negado/)
  })
})

describe('dados financeiros e administrativos', () => {
  it('dono não cria nem altera a própria assinatura pela API', async () => {
    const { dono, negocio } = await novoDonoComNegocio()
    await expect(
      como(db, dono, (tx) =>
        tx.query(`insert into public.assinaturas (negocio_id, plano_id, status, valor_centavos) values ($1,'destaque','ativa',0)`, [negocio])
      )
    ).rejects.toThrow(/permission denied/)
    await assinar(negocio, 'profissional', { status: 'pendente' })
    await expect(como(db, dono, (tx) => tx.query(`update public.assinaturas set status = 'ativa' where negocio_id = $1`, [negocio]))).rejects.toThrow(
      /permission denied/
    )
  })

  it('dono lê a própria assinatura; outro dono não', async () => {
    const a = await novoDonoComNegocio()
    const b = await novoDonoComNegocio()
    await assinar(a.negocio, 'profissional', { status: 'pendente' })
    const proprio = await como(db, a.dono, (tx) => tx.query('select id from public.assinaturas where negocio_id = $1', [a.negocio]))
    expect(proprio.rows).toHaveLength(1)
    const alheio = await como(db, b.dono, (tx) => tx.query('select id from public.assinaturas where negocio_id = $1', [a.negocio]))
    expect(alheio.rows).toHaveLength(0)
  })

  it('usuário não altera preço de plano nem configurações', async () => {
    const u = await criarUsuario(db)
    await expect(como(db, u, (tx) => tx.query(`update public.planos set preco_centavos = 0`))).rejects.toThrow(/permission denied/)
    await expect(
      como(db, u, (tx) => tx.query(`update public.configuracoes_sistema set valor = 'true' where chave = 'moderacao_previa_negocios'`))
    ).rejects.toThrow(/permission denied/)
  })

  it('configuração não pública fica invisível pra usuário comum', async () => {
    const u = await criarUsuario(db)
    const r = await como(db, u, (tx) => tx.query(`select chave from public.configuracoes_sistema where chave = 'termos_sinalizados'`))
    expect(r.rows).toHaveLength(0)
  })

  it('auditoria e webhooks: invisíveis pra usuário comum', async () => {
    const u = await criarUsuario(db)
    await db.query(`insert into public.registros_auditoria (acao) values ('teste')`)
    const r = await como(db, u, (tx) => tx.query('select id from public.registros_auditoria'))
    expect(r.rows).toHaveLength(0)
  })
})

describe('autocadastro de negócio (self-service)', () => {
  async function cadastrar(usuario: string, nome: string, descricao = '') {
    return como(db, usuario, (tx) =>
      tx.query<{ status_cadastro: string; motivo_moderacao: string | null }>(
        `insert into public.negocios (nome, descricao, reivindicado_por, origem, status_cadastro)
         values ($1, $2, $3, 'cadastro_manual', 'pendente') returning status_cadastro, motivo_moderacao`,
        [nome, descricao, usuario]
      )
    )
  }

  it('cadastro comum é aprovado na hora, sem fila manual', async () => {
    const u = await criarUsuario(db)
    const r = await cadastrar(u, 'Salão da Ana')
    expect(r.rows[0].status_cadastro).toBe('aprovado')
  })

  it('mesma conta pode ter vários negócios, mas o banco segura acima do limite configurado', async () => {
    const u = await criarUsuario(db)
    await cadastrar(u, 'Primeiro')
    await cadastrar(u, 'Segundo')
    await db.query(`update public.configuracoes_sistema set valor = '2' where chave = 'max_negocios_por_dono'`)
    await expect(cadastrar(u, 'Terceiro')).rejects.toThrow(/NEGOCIO_DUPLICADO/)
    await db.query(`update public.configuracoes_sistema set valor = '5' where chave = 'max_negocios_por_dono'`)
  })

  it('morador vira profissional ao cadastrar', async () => {
    const u = await criarUsuario(db)
    await cadastrar(u, 'Doces da Bia')
    const { rows } = await db.query<{ papel: string }>('select papel from public.perfis where id = $1', [u])
    expect(rows[0].papel).toBe('profissional')
  })

  it('não dá pra se inserir já verificado', async () => {
    const u = await criarUsuario(db)
    await expect(
      como(db, u, (tx) =>
        tx.query(`insert into public.negocios (nome, reivindicado_por, origem, verificado) values ('x', $1, 'cadastro_manual', true)`, [u])
      )
    ).rejects.toThrow(/row-level security/)
  })

  it('termo sinalizado manda pra revisão com motivo', async () => {
    await db.query(`update public.configuracoes_sistema set valor = '["pirâmide"]' where chave = 'termos_sinalizados'`)
    const u = await criarUsuario(db)
    const r = await cadastrar(u, 'Ganhe dinheiro', 'Entre na nossa PIRÂMIDE')
    expect(r.rows[0].status_cadastro).toBe('pendente')
    expect(r.rows[0].motivo_moderacao).toMatch(/pirâmide/)
    await db.query(`update public.configuracoes_sistema set valor = '[]' where chave = 'termos_sinalizados'`)
  })

  it('moderação prévia ligada nas configurações segura todo cadastro', async () => {
    await db.query(`update public.configuracoes_sistema set valor = 'true' where chave = 'moderacao_previa_negocios'`)
    const u = await criarUsuario(db)
    const r = await cadastrar(u, 'Qualquer')
    expect(r.rows[0].status_cadastro).toBe('pendente')
    await db.query(`update public.configuracoes_sistema set valor = 'false' where chave = 'moderacao_previa_negocios'`)
  })

  it('dono não se autoaprova depois de cair na revisão', async () => {
    await db.query(`update public.configuracoes_sistema set valor = 'true' where chave = 'moderacao_previa_negocios'`)
    const u = await criarUsuario(db)
    await cadastrar(u, 'Esperando')
    await db.query(`update public.configuracoes_sistema set valor = 'false' where chave = 'moderacao_previa_negocios'`)
    await como(db, u, (tx) => tx.query(`update public.negocios set status_cadastro = 'aprovado' where reivindicado_por = $1`, [u]))
    const { rows } = await db.query<{ status_cadastro: string }>('select status_cadastro from public.negocios where reivindicado_por = $1', [u])
    expect(rows[0].status_cadastro).toBe('pendente')
  })
})
