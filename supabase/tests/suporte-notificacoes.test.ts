import { beforeAll, describe, expect, it } from 'vitest'
import { criarBanco, criarUsuario, como, type Banco } from './harness'

let db: Banco
let ana: string
let beto: string
let chamadoAna: string

beforeAll(async () => {
  db = await criarBanco()
  ana = await criarUsuario(db)
  beto = await criarUsuario(db)
  const r = await como(db, ana, (tx) =>
    tx.query<{ id: string }>(
      `insert into public.chamados_suporte (perfil_id, categoria, assunto) values ($1, 'conta', 'Não consigo entrar') returning id`,
      [ana]
    )
  )
  chamadoAna = r.rows[0].id
}, 60_000)

describe('chamados de suporte', () => {
  it('usuário vê só os próprios chamados', async () => {
    const r = await como(db, beto, (tx) => tx.query('select id from public.chamados_suporte where id = $1', [chamadoAna]))
    expect(r.rows).toHaveLength(0)
  })

  it('ninguém abre chamado em nome de outra pessoa', async () => {
    await expect(
      como(db, beto, (tx) =>
        tx.query(`insert into public.chamados_suporte (perfil_id, categoria, assunto) values ($1, 'conta', 'falso chamado')`, [ana])
      )
    ).rejects.toThrow(/row-level security/)
  })

  it('usuário não se passa pelo suporte nem escreve no chamado alheio', async () => {
    await expect(
      como(db, ana, (tx) =>
        tx.query(`insert into public.mensagens_chamado (chamado_id, autor_id, do_suporte, corpo) values ($1, $2, true, 'resolvido!')`, [
          chamadoAna,
          ana,
        ])
      )
    ).rejects.toThrow(/row-level security/)
    await expect(
      como(db, beto, (tx) =>
        tx.query(`insert into public.mensagens_chamado (chamado_id, autor_id, corpo) values ($1, $2, 'oi')`, [chamadoAna, beto])
      )
    ).rejects.toThrow(/row-level security/)
  })

  it('usuário não muda o status do próprio chamado direto pela API', async () => {
    await expect(
      como(db, ana, (tx) => tx.query(`update public.chamados_suporte set status = 'resolvido' where id = $1`, [chamadoAna]))
    ).rejects.toThrow(/permission denied/)
  })

  it('caminho legítimo: dona do chamado responde', async () => {
    await como(db, ana, (tx) =>
      tx.query(`insert into public.mensagens_chamado (chamado_id, autor_id, corpo) values ($1, $2, 'mais detalhes')`, [chamadoAna, ana])
    )
    const r = await como(db, ana, (tx) => tx.query('select corpo from public.mensagens_chamado where chamado_id = $1', [chamadoAna]))
    expect(r.rows).toHaveLength(1)
  })
})

describe('notificações no app', () => {
  it('usuário não cria notificação (nem pra si nem pros outros)', async () => {
    await expect(
      como(db, ana, (tx) => tx.query(`insert into public.notificacoes (perfil_id, tipo, titulo) values ($1, 'x', 'spam')`, [beto]))
    ).rejects.toThrow(/permission denied/)
  })

  it('usuário só marca como lida, não reescreve o texto', async () => {
    const { rows } = await db.query<{ id: string }>(
      `insert into public.notificacoes (perfil_id, tipo, titulo) values ($1, 'assinatura', 'Plano ativado') returning id`,
      [ana]
    )
    await como(db, ana, (tx) => tx.query('update public.notificacoes set lida_em = now() where id = $1', [rows[0].id]))
    await expect(
      como(db, ana, (tx) => tx.query(`update public.notificacoes set titulo = 'x' where id = $1`, [rows[0].id]))
    ).rejects.toThrow(/permission denied/)
    const outra = await como(db, beto, (tx) => tx.query('select id from public.notificacoes where id = $1', [rows[0].id]))
    expect(outra.rows).toHaveLength(0)
  })

  it('url de notificação só aceita caminho interno', async () => {
    await expect(
      db.query(`insert into public.notificacoes (perfil_id, tipo, titulo, url) values ($1, 'x', 'y', 'https://phishing.com')`, [ana])
    ).rejects.toThrow(/violates check/)
  })

  it('preferências de comunicação: usuário altera as próprias', async () => {
    await como(db, ana, (tx) =>
      tx.query(`update public.perfis set preferencias_notificacao = '{"mural": false}'::jsonb where id = $1`, [ana])
    )
    const r = await como(db, ana, (tx) => tx.query<{ p: any }>('select preferencias_notificacao p from public.meu_perfil()'))
    expect(r.rows[0].p.mural).toBe(false)
  })
})
