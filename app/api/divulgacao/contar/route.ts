import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/server'
import { ehRobo } from '@/lib/metricas/eventos-perfil'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'

export const dynamic = 'force-dynamic'

/** Visualização/clique de banner pago (o relatório do lojista e do admin vem daqui). */
export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null)
  const id = String(corpo?.id ?? '')
  const tipo = corpo?.tipo === 'clique' ? 'clique' : 'impressao'
  if (!/^[0-9a-f-]{36}$/i.test(id) || ehRobo(request.headers.get('user-agent'))) return new NextResponse(null, { status: 204 })
  // o mesmo aparelho não infla o relatório do anunciante (vale por banner e por tipo)
  if (!(await dentroDoLimite(`banner:${tipo}:${id}:${ipDoRequest()}`, tipo === 'clique' ? 3 : 10, 3600))) return new NextResponse(null, { status: 204 })
  await createPublicClient().rpc('contar_banner', { p_compra_id: id, p_tipo: tipo })
  return new NextResponse(null, { status: 204 })
}
