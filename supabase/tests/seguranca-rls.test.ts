/**
 * RLS, triggers e permissões com TODAS as migrations aplicadas.
 * Cenários negativos primeiro: o que um usuário mal-intencionado tenta.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco
let donoA: string
let donoB: string
let morador: string
let negocioA: string
let negocioB: string

async function criarNegocio(dono: string, nome: string) {
  const { rows } = await db.query<{ id: string }>(
    `insert into public.negocios (nome, reivindicado_por, status_cadastro) values ($1, $2, 'aprovado') returning id`,
    [nome, dono]
  )
  return rows[0].id
}

async function esperaNegado(promessa: Promise<unknown>) {
  await expect(promessa).rejects.toThrow(/permission denied|row-level security|violates|LIMITE_PLANO/i)
}

beforeAll(async () => {
  db = await criarBanco()
  donoA = await criarUsuario(db, { papel: 'profissional' })
  donoB = await criarUsuario(db, { papel: 'profissional' })
  morador = await criarUsuario(db)
  negocioA = await criarNegocio(donoA, 'Padaria A')
  negocioB = await criarNegocio(donoB, 'Oficina B')
}, 60_000)

describe('administração da plataforma', () => {
  it('signUp com papel=admin vira morador e não ganha acesso admin', async () => {
    const id = await criarUsuario(db, { papel: 'admin' })
    const { rows } = await db.query<{ papel: string }>('select papel from public.perfis where id = $1', [id])
    expect(rows[0].papel).toBe('morador')
    const eh = await como(db, id, (tx) => tx.query<{ eh_admin: boolean }>('select public.eh_admin()'))
    expect(eh.rows[0].eh_admin).toBe(false)
  })

  it('usuário não consegue se promover via update em perfis', async () => {
    await como(db, morador, (tx) => tx.query(`update public.perfis set papel = 'admin' where id = $1`, [morador]))
    const { rows } = await db.query<{ papel: string }>('select papel from public.perfis where id = $1', [morador])
    expect(rows[0].papel).toBe('morador')
  })

  it('usuário não consegue se inserir na tabela de administradores', async () => {
    await esperaNegado(
      como(db, morador, (tx) => tx.query('insert into public.administradores_plataforma (perfil_id) values ($1)', [morador]))
    )
  })

  it('conceder_admin não é chamável pela API', async () => {
    await esperaNegado(como(db, morador, (tx) => tx.query(`select public.conceder_admin('x@y.z')`)))
  })

  it('perfis.papel=admin sem linha na tabela não dá acesso', async () => {
    const id = await criarUsuario(db)
    await db.query(`update public.perfis set papel = 'admin' where id = $1`, [id]) // como postgres
    const r = await como(db, id, (tx) => tx.query<{ meu_papel: string }>('select public.meu_papel()'))
    expect(r.rows[0].meu_papel).toBe('morador')
  })

  it('admin concedido via SQL funciona', async () => {
    const id = await criarUsuario(db)
    const { rows } = await db.query<{ email: string }>('select email from auth.users where id = $1', [id])
    await db.query('select public.conceder_admin($1)', [rows[0].email])
    const r = await como(db, id, (tx) => tx.query<{ eh_admin: boolean }>('select public.eh_admin()'))
    expect(r.rows[0].eh_admin).toBe(true)
  })
})

describe('privacidade de perfis', () => {
  it('anônimo não lê telefone de ninguém', async () => {
    await db.query(`update public.perfis set telefone = '21900000000' where id = $1`, [morador])
    await esperaNegado(como(db, null, (tx) => tx.query('select telefone from public.perfis')))
  })

  it('usuário logado não lê telefone de outro usuário', async () => {
    await esperaNegado(como(db, donoA, (tx) => tx.query('select telefone from public.perfis where id = $1', [morador])))
  })

  it('morador sem atividade pública não aparece nem pelo nome', async () => {
    const r = await como(db, null, (tx) => tx.query('select nome_completo from public.perfis where id = $1', [morador]))
    expect(r.rows).toHaveLength(0)
  })

  it('usuário lê o próprio perfil completo via meu_perfil()', async () => {
    const r = await como(db, morador, (tx) => tx.query<{ telefone: string }>('select telefone from public.meu_perfil()'))
    expect(r.rows[0].telefone).toBe('21900000000')
  })

  it('usuário não altera o próprio código de convite', async () => {
    await esperaNegado(
      como(db, morador, (tx) => tx.query(`update public.perfis set codigo_convite = 'hack' where id = $1`, [morador]))
    )
  })
})

describe('controles positivos (o caminho legítimo continua funcionando)', () => {
  it('dono A edita o próprio negócio e cria produto nele', async () => {
    await como(db, donoA, async (tx) => {
      await tx.query(`update public.negocios set descricao = 'pão quente' where id = $1`, [negocioA])
      await tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, 'Pão francês')`, [negocioA])
    })
    const { rows } = await db.query<{ descricao: string }>('select descricao from public.negocios where id = $1', [negocioA])
    expect(rows[0].descricao).toBe('pão quente')
  })

  it('usuário atualiza o próprio telefone e bairro', async () => {
    await como(db, morador, (tx) =>
      tx.query(`update public.perfis set telefone = '21900000000', bairro = 'Centro' where id = $1`, [morador])
    )
    const { rows } = await db.query<{ bairro: string }>('select bairro from public.perfis where id = $1', [morador])
    expect(rows[0].bairro).toBe('Centro')
  })

  it('visitante anônimo lê negócios aprovados', async () => {
    const r = await como(db, null, (tx) => tx.query('select nome from public.negocios where id = $1', [negocioA]))
    expect(r.rows).toHaveLength(1)
  })
})

describe('isolamento entre negócios', () => {
  it('dono A não altera dados do negócio B', async () => {
    await como(db, donoA, (tx) => tx.query(`update public.negocios set nome = 'invadido' where id = $1`, [negocioB]))
    const { rows } = await db.query<{ nome: string }>('select nome from public.negocios where id = $1', [negocioB])
    expect(rows[0].nome).toBe('Oficina B')
  })

  it('dono A não cria produto no negócio B', async () => {
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(`insert into public.produtos_servicos (negocio_id, nome) values ($1, 'x')`, [negocioB])
      )
    )
  })

  it('dono A não apaga produto do negócio B', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.produtos_servicos (negocio_id, nome) values ($1, 'Pneu') returning id`,
      [negocioB]
    )
    await como(db, donoA, (tx) => tx.query('delete from public.produtos_servicos where id = $1', [rows[0].id]))
    const depois = await db.query('select 1 from public.produtos_servicos where id = $1', [rows[0].id])
    expect(depois.rows).toHaveLength(1)
  })

  it('dono A não publica vaga em nome do negócio B', async () => {
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(
          `insert into public.vagas (titulo, empresa_nome, negocio_id, descricao, publicado_por) values ('x','Oficina B',$1,'y',$2)`,
          [negocioB, donoA]
        )
      )
    )
  })

  it('dono A não publica post no negócio B', async () => {
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(`insert into public.posts_negocio (negocio_id, autor_id, titulo) values ($1, $2, 'x')`, [negocioB, donoA])
      )
    )
  })

  it('dono não se autopromove a verificado/destaque', async () => {
    await como(db, donoA, (tx) =>
      tx.query(`update public.negocios set verificado = true, destaque_ativo = true where id = $1`, [negocioA])
    )
    const { rows } = await db.query<{ verificado: boolean; destaque_ativo: boolean }>(
      'select verificado, destaque_ativo from public.negocios where id = $1',
      [negocioA]
    )
    expect(rows[0]).toEqual({ verificado: false, destaque_ativo: false })
  })

  it('métricas: ninguém insere evento de perfil pela API', async () => {
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(`insert into public.eventos_perfil (negocio_id, tipo) values ($1, 'visualizacao')`, [negocioA])
      )
    )
  })
})

describe('avaliações', () => {
  it('dono só altera a resposta, nunca a nota', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.avaliacoes (negocio_id, autor_id, nota, comentario) values ($1, $2, 1, 'ruim') returning id`,
      [negocioA, morador]
    )
    await como(db, donoA, (tx) =>
      tx.query(`update public.avaliacoes set nota = 5, comentario = 'ótimo', resposta_profissional = 'obrigado' where id = $1`, [
        rows[0].id,
      ])
    )
    const depois = await db.query<{ nota: number; comentario: string; resposta_profissional: string }>(
      'select nota, comentario, resposta_profissional from public.avaliacoes where id = $1',
      [rows[0].id]
    )
    expect(depois.rows[0]).toEqual({ nota: 1, comentario: 'ruim', resposta_profissional: 'obrigado' })
  })

  it('autor não forja a resposta do dono', async () => {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.avaliacoes where negocio_id = $1 and autor_id = $2`,
      [negocioA, morador]
    )
    await como(db, morador, (tx) =>
      tx.query(`update public.avaliacoes set resposta_profissional = 'forjado' where id = $1`, [rows[0].id])
    )
    const depois = await db.query<{ resposta_profissional: string }>(
      'select resposta_profissional from public.avaliacoes where id = $1',
      [rows[0].id]
    )
    expect(depois.rows[0].resposta_profissional).toBe('obrigado')
  })

  it('dono não avalia o próprio negócio', async () => {
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(`insert into public.avaliacoes (negocio_id, autor_id, nota) values ($1, $2, 5)`, [negocioA, donoA])
      )
    )
  })

  it('autor da avaliação passa a ter o nome visível publicamente', async () => {
    const r = await como(db, null, (tx) => tx.query('select nome_completo from public.perfis where id = $1', [morador]))
    expect(r.rows).toHaveLength(1)
  })
})

describe('storage', () => {
  it('dono A grava em negocios/<A>/ mas não em negocios/<B>/', async () => {
    await como(db, donoA, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name, owner) values ('imagens', $1, $2)`, [
        `negocios/${negocioA}/capa.jpg`,
        donoA,
      ])
    )
    await esperaNegado(
      como(db, donoA, (tx) =>
        tx.query(`insert into storage.objects (bucket_id, name, owner) values ('imagens', $1, $2)`, [
          `negocios/${negocioB}/capa.jpg`,
          donoA,
        ])
      )
    )
  })

  it('usuário grava só na própria pasta usuarios/<id>/', async () => {
    await como(db, morador, (tx) =>
      tx.query(`insert into storage.objects (bucket_id, name, owner) values ('imagens', $1, $2)`, [
        `usuarios/${morador}/a.jpg`,
        morador,
      ])
    )
    await esperaNegado(
      como(db, morador, (tx) =>
        tx.query(`insert into storage.objects (bucket_id, name, owner) values ('imagens', $1, $2)`, [
          `usuarios/${donoA}/a.jpg`,
          morador,
        ])
      )
    )
  })

  it('caminho fora do padrão é recusado', async () => {
    await esperaNegado(
      como(db, morador, (tx) =>
        tx.query(`insert into storage.objects (bucket_id, name, owner) values ('imagens', 'qualquer/coisa.jpg', $1)`, [morador])
      )
    )
  })
})

describe('funções internas e exclusão de conta', () => {
  it('rate limit não é chamável pela API', async () => {
    await esperaNegado(como(db, null, (tx) => tx.query(`select public.verificar_rate_limit('login:1.2.3.4', 1, 60)`)))
  })

  it('excluir a conta de um dono com negócio, posts e vagas funciona', async () => {
    const dono = await criarUsuario(db, { papel: 'profissional' })
    const negocio = await criarNegocio(dono, 'Temporária')
    await db.query(`insert into public.posts_negocio (negocio_id, autor_id, titulo) values ($1, $2, 'oi')`, [negocio, dono])
    await db.query(
      `insert into public.vagas (titulo, empresa_nome, negocio_id, descricao, publicado_por) values ('v','e',$1,'d',$2)`,
      [negocio, dono]
    )
    // no Supabase isso é auth.admin.deleteUser() (GoTrue apaga auth.users como superusuário)
    await db.query('delete from auth.users where id = $1', [dono])
    const { rows } = await db.query('select 1 from public.perfis where id = $1', [dono])
    expect(rows).toHaveLength(0)
  })

  it('site com javascript: é recusado', async () => {
    await esperaNegado(
      db.query(`update public.negocios set site = 'javascript:alert(1)' where id = $1`, [negocioA])
    )
  })
})
