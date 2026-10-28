import { NextRequest, NextResponse } from 'next/server'
import { negocioDoPainel } from '@/lib/painel/negocio-atual'
import { recursoLiberado } from '@/lib/planos/recursos'
import { mesValido, montarRelatorioMensal, relatorioParaCsv } from '@/lib/relatorios/mensal'

export const dynamic = 'force-dynamic'

/** Planilha do mês do negócio aberto no painel (precisa do recurso "relatório mensal" no plano). */
export async function GET(request: NextRequest) {
  const { negocio } = await negocioDoPainel()
  if (!negocio) return NextResponse.json({ erro: 'Entre na conta do seu negócio.' }, { status: 401 })
  if (!(await recursoLiberado(negocio.id, 'relatorio_mensal'))) return NextResponse.json({ erro: 'Seu plano não inclui o relatório mensal.' }, { status: 403 })
  const mes = request.nextUrl.searchParams.get('mes') ?? ''
  if (!mesValido(mes)) return NextResponse.json({ erro: 'Mês inválido.' }, { status: 400 })
  const csv = relatorioParaCsv(await montarRelatorioMensal(negocio.id, mes), negocio.nome)
  const arquivo = `tangua-${(negocio.slug ?? 'negocio').slice(0, 40)}-${mes}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${arquivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
