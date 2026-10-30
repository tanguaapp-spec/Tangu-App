import { NextRequest, NextResponse } from 'next/server'
import { verificarAdmin } from '@/lib/auth/require-admin'
import { createServiceClient } from '@/lib/supabase/server'
import { diaISO } from '@/lib/datas'

export const dynamic = 'force-dynamic'

function celula(valor: unknown) {
  const texto = valor === null || valor === undefined ? '' : typeof valor === 'string' ? valor : JSON.stringify(valor)
  // neutraliza fórmula em planilha (=, +, -, @) e escapa aspas
  const seguro = /^[=+\-@]/.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

/** Planilha dos logs de erro do período (até 5.000 linhas) — só admin. */
export async function GET(request: NextRequest) {
  const auth = await verificarAdmin()
  if ('erro' in auth) return NextResponse.json({ erro: auth.erro }, { status: 403 })
  const dias = [1, 7, 30, 90].includes(Number(request.nextUrl.searchParams.get('dias'))) ? Number(request.nextUrl.searchParams.get('dias')) : 30
  const { data } = await createServiceClient()
    .from('error_logs')
    .select('*')
    .gte('criado_em', new Date(Date.now() - dias * 86400e3).toISOString())
    .order('criado_em', { ascending: false })
    .limit(5000)
  const cabecalho = ['criado_em', 'nivel', 'origem', 'mensagem', 'contexto', 'url', 'usuario_id', 'detalhes', 'resolvido_em', 'nota_resolucao', 'stack']
  const linhas = (data ?? []).map((l) => cabecalho.map((c) => celula((l as Record<string, unknown>)[c])).join(','))
  const csv = '﻿' + [cabecalho.join(','), ...linhas].join('\r\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="logs-erro-${diaISO()}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
