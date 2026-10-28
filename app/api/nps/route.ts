import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'

export const dynamic = 'force-dynamic'

const schema = z.object({
  nota: z.number().int().min(0).max(10),
  comentario: z.string().trim().max(1000).optional(),
})

/** "De 0 a 10, quanto você recomendaria o Tanguá App?" — base do NPS do painel de crescimento. */
export async function POST(request: NextRequest) {
  const v = schema.safeParse(await request.json().catch(() => null))
  if (!v.success) return NextResponse.json({ erro: 'Resposta inválida.' }, { status: 400 })
  if (!(await dentroDoLimite(`nps:${ipDoRequest()}`, 5, 86400))) return NextResponse.json({ erro: 'Obrigado! Já recebemos sua resposta.' }, { status: 429 })
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let publico: 'morador' | 'negocio' = 'morador'
  if (user) {
    const { count } = await supabase.from('negocios').select('id', { count: 'exact', head: true }).eq('reivindicado_por', user.id)
    if ((count ?? 0) > 0) publico = 'negocio'
  }
  await createServiceClient().from('respostas_nps').insert({ perfil_id: user?.id ?? null, publico, nota: v.data.nota, comentario: v.data.comentario || null })
  return NextResponse.json({ ok: true })
}
