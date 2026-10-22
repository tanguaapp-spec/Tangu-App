/**
 * Migrations aplicadas sobre dados que já existem em produção — não só em
 * banco vazio. Regressão: a 0019 falhava no Supabase com cupons já vencidos
 * (check cupons_janela_valida violado).
 */
import { describe, expect, it } from 'vitest'
import { aplicarMigrationsDepoisDe, criarBanco, criarUsuario } from './harness'

describe('0019 sobre cupons já existentes', () => {
  it('aplica com cupom vencido, vigente e com expiração igual à criação', async () => {
    const db = await criarBanco({ ate: '0018_suporte_notificacoes_lgpd.sql' })
    const dono = await criarUsuario(db, { papel: 'profissional' })
    const { rows } = await db.query<{ id: string }>(
      `insert into public.negocios (nome, reivindicado_por, status_cadastro) values ('Loja', $1, 'aprovado') returning id`,
      [dono]
    )
    const negocio = rows[0].id
    await db.query(
      `insert into public.cupons (negocio_id, titulo, desconto_texto, expira_em, criado_em) values
        ($1, 'vencido', '10%', now() - interval '10 days', now() - interval '20 days'),
        ($1, 'vigente', '10%', now() + interval '2 days', now() - interval '1 day'),
        ($1, 'estranho', '10%', now() - interval '5 days', now() - interval '5 days')`,
      [negocio]
    )

    await aplicarMigrationsDepoisDe(db, '0018_suporte_notificacoes_lgpd.sql')

    const { rows: cupons } = await db.query<{ titulo: string; ok: boolean }>(
      `select titulo, expira_em > inicia_em as ok from public.cupons order by titulo`
    )
    expect(cupons.every((c) => c.ok)).toBe(true)
  }, 60_000)
})
