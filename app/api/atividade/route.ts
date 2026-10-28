import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ehRobo } from '@/lib/metricas/eventos-perfil'
import { dentroDoLimite, ipDoRequest } from '@/lib/seguranca/rate-limit'
import { moduloAtivo } from '@/lib/config/ler'

export const dynamic = 'force-dynamic'

/** Dia em Tanguá (o "dia" do DAU vira à meia-noite de Brasília, não de Londres). */
function hojeEmTangua() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}

/**
 * Uma marcação por aparelho por dia: base do DAU/WAU/MAU e da retenção no
 * painel de crescimento. O id do aparelho chega aleatório e é guardado com
 * hash; nada de IP nem dado pessoal.
 */
export async function POST(request: NextRequest) {
  const corpo = await request.json().catch(() => null)
  const bruto = String(corpo?.visitante ?? '')
  if (!/^[a-z0-9-]{16,64}$/i.test(bruto) || ehRobo(request.headers.get('user-agent'))) return NextResponse.json({ ok: false })
  if (!(await dentroDoLimite(`atividade:${ipDoRequest()}`, 60, 3600))) return NextResponse.json({ ok: false })

  const sal = process.env.METRICAS_SAL ?? 'tangua-metricas'
  const visitante = createHash('sha256').update(`${sal}|aparelho|${bruto}`).digest('hex').slice(0, 40)
  const {
    data: { user },
  } = await createClient().auth.getUser()
  const db = createServiceClient()
  const linha = {
    dia: hojeEmTangua(),
    visitante,
    perfil_id: user?.id ?? null,
    instalado: corpo?.instalado === true,
    primeira_pagina: String(corpo?.pagina ?? '').slice(0, 120) || null,
    origem: String(corpo?.origem ?? '').slice(0, 60) || null,
  }
  const { error } = await db.from('atividade_diaria').insert(linha)
  // já marcado hoje: só completa quem entrou na conta depois
  if (error?.code === '23505' && user) {
    await db.from('atividade_diaria').update({ perfil_id: user.id }).eq('dia', linha.dia).eq('visitante', visitante).is('perfil_id', null)
  }
  return NextResponse.json({ ok: true, nps: await moduloAtivo('nps') })
}
