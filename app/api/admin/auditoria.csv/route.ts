import { NextRequest, NextResponse } from 'next/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function celula(valor: unknown) {
  const texto = valor === null || valor === undefined ? '' : typeof valor === 'string' ? valor : JSON.stringify(valor)
  // neutraliza fórmula em planilha (=, +, -, @) e escapa aspas
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

/** Exportação da auditoria (até 5.000 linhas) — só admin, e a própria exportação é auditada. */
export async function GET(request: NextRequest) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return NextResponse.json({ erro: auth.erro }, { status: 403 })

  const acao = (new URL(request.url).searchParams.get('acao') ?? '').replace(/[^a-z_.]/g, '').slice(0, 40)
  const db = createServiceClient()
  let consulta = db
    .from('registros_auditoria')
    .select('criado_em, ator_id, acao, entidade, entidade_id, dados')
    .order('criado_em', { ascending: false })
    .limit(5000)
  if (acao) consulta = consulta.ilike('acao', `${acao}%`)
  const { data } = await consulta

  await db.from('registros_auditoria').insert({ ator_id: auth.user.id, acao: 'auditoria.exportar', entidade: 'sistema', dados: { filtro: acao, linhas: data?.length ?? 0 } })

  const cabecalho = ['criado_em', 'ator_id', 'acao', 'entidade', 'entidade_id', 'dados']
  const linhas = (data ?? []).map((l) => cabecalho.map((c) => celula((l as Record<string, unknown>)[c])).join(','))
  const csv = '﻿' + [cabecalho.join(','), ...linhas].join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="auditoria-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
