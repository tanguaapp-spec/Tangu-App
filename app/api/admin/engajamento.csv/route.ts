import { NextRequest, NextResponse } from 'next/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { mesAtual, mesValido, rankingDoMes } from '@/lib/gamificacao/ranking'

export const dynamic = 'force-dynamic'

function celula(valor: unknown) {
  const texto = valor === null || valor === undefined ? '' : String(valor)
  // neutraliza fórmula em planilha (=, +, -, @) e escapa aspas
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

/** Ranking de engajamento do mês, com contato de cada pessoa para combinar o prêmio — só admin. */
export async function GET(request: NextRequest) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return NextResponse.json({ erro: auth.erro }, { status: 403 })
  const pedido = request.nextUrl.searchParams.get('mes')
  const mes = mesValido(pedido) ? pedido! : mesAtual()
  const db = createServiceClient()
  const ranking = (await rankingDoMes(db, mes, 200)) ?? []
  const ids = ranking.map((l) => l.perfil_id)
  const [{ data: perfis }, contas] = await Promise.all([
    db.from('perfis').select('id, whatsapp, telefone, papel').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    Promise.all(ids.map((id) => db.auth.admin.getUserById(id))),
  ])
  const extra = new Map((perfis ?? []).map((p) => [p.id as string, p]))
  const cabecalho = ['posicao', 'nome', 'email', 'whatsapp', 'bairro', 'tipo_de_conta', 'laranjas_no_mes', 'indicacoes', 'avaliacoes', 'favoritos', 'saldo_total']
  const linhas = ranking.map((l, i) => {
    const p = extra.get(l.perfil_id)
    return [i + 1, l.nome, contas[i]?.data.user?.email ?? '', p?.whatsapp || p?.telefone || '', l.bairro, p?.papel, l.laranjas, l.indicacoes, l.avaliacoes, l.favoritos, l.saldo_total]
      .map(celula)
      .join(',')
  })
  const csv = '﻿' + [cabecalho.join(','), ...linhas].join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="engajamento-${mes}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
