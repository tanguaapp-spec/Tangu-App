import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { enviarNotificacaoParaPerfis } from '@/lib/push/enviar-notificacao'

export const dynamic = 'force-dynamic'

/**
 * Roda 1x por dia (ver vercel.json) e manda um push só, resumindo o que
 * apareceu de novo nas últimas 24h pro bairro de cada morador inscrito.
 * Isso é o "gatilho" do loop diário — sem isso, o resto da gamificação
 * (achado do dia, selos) depende do morador lembrar de abrir o app sozinho.
 *
 * Protegido por CRON_SECRET (configurado nas Environment Variables da
 * Vercel) — sem isso, qualquer um poderia disparar notificação em massa.
 */
export async function GET(request: NextRequest) {
  const segredoEsperado = process.env.CRON_SECRET
  const autorizacao = request.headers.get('authorization')

  if (!segredoEsperado) {
    return NextResponse.json({ erro: 'CRON_SECRET não configurado.' }, { status: 500 })
  }
  if (autorizacao !== `Bearer ${segredoEsperado}`) {
    return NextResponse.json({ erro: 'Não autorizado.' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: moradores, error: erroMoradores } = await supabase
    .from('perfis')
    .select('id, bairro')
    .eq('notificacoes_resumo_diario', true)
    .not('bairro', 'is', null)

  if (erroMoradores) {
    return NextResponse.json({ erro: erroMoradores.message }, { status: 500 })
  }
  if (!moradores || moradores.length === 0) {
    return NextResponse.json({ enviados: 0, bairros: 0, motivo: 'nenhum morador com bairro + opt-in' })
  }

  // só quem tem push realmente ativo, senão a notificação vai pro vazio
  const { data: inscritos } = await supabase.from('push_subscriptions').select('perfil_id')
  const idsComPush = new Set((inscritos ?? []).map((i) => i.perfil_id))

  const moradoresPorBairro = new Map<string, string[]>()
  for (const m of moradores) {
    if (!m.bairro || !idsComPush.has(m.id)) continue
    const lista = moradoresPorBairro.get(m.bairro) ?? []
    lista.push(m.id)
    moradoresPorBairro.set(m.bairro, lista)
  }

  let bairrosNotificados = 0
  let totalEnviados = 0

  for (const [bairro, perfilIds] of moradoresPorBairro) {
    const [{ count: novosAvisos }, { count: novasVagas }, { data: negociosDoBairro }] = await Promise.all([
      supabase
        .from('avisos_cidade')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .gte('criado_em', desde)
        .or(`bairro.eq.${bairro},bairro.is.null`),
      supabase
        .from('vagas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberta')
        .eq('bairro', bairro)
        .gte('criado_em', desde),
      supabase.from('negocios').select('id').eq('bairro', bairro).eq('ativo', true),
    ])

    const idsNegocios = (negociosDoBairro ?? []).map((n) => n.id)
    let novosPosts = 0
    if (idsNegocios.length > 0) {
      const { count } = await supabase
        .from('posts_negocio')
        .select('*', { count: 'exact', head: true })
        .eq('ativo', true)
        .gte('criado_em', desde)
        .in('negocio_id', idsNegocios)
      novosPosts = count ?? 0
    }

    const total = (novosAvisos ?? 0) + (novasVagas ?? 0) + novosPosts
    if (total === 0) continue

    const partes: string[] = []
    if (novosAvisos) partes.push(`${novosAvisos} ${novosAvisos === 1 ? 'aviso' : 'avisos'}`)
    if (novasVagas) partes.push(`${novasVagas} ${novasVagas === 1 ? 'vaga' : 'vagas'}`)
    if (novosPosts) partes.push(`${novosPosts} ${novosPosts === 1 ? 'novidade' : 'novidades'}`)

    await enviarNotificacaoParaPerfis(perfilIds, {
      title: `O que rolou em ${bairro} hoje`,
      body: partes.join(', ') + '.',
      url: '/mural',
      tag: 'resumo-diario',
    })

    bairrosNotificados++
    totalEnviados += perfilIds.length
  }

  return NextResponse.json({ enviados: totalEnviados, bairros: bairrosNotificados })
}
