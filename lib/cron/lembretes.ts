import { createServiceClient } from '@/lib/supabase/server'
import { notificar } from '@/lib/notificacoes/notificar'

/**
 * Tarefas que rodam junto do resumo diário (8h em Tanguá, depois do
 * horário silencioso). Cada uma é independente: se uma falhar, as outras
 * seguem, e tudo é idempotente (marca o que já mandou).
 */

/** "Como foi na X?" 2 dias depois de chamar no WhatsApp ou usar cupom. */
export async function enviarLembretesAvaliacao(agora = new Date()) {
  const db = createServiceClient()
  const { data } = await db
    .from('lembretes_avaliacao')
    .select('perfil_id, negocio_id, motivo, negocio:negocios(nome, slug, ativo)')
    .is('enviado_em', null)
    .lte('enviar_apos', agora.toISOString())
    .limit(300)
  let enviados = 0
  for (const l of data ?? []) {
    const negocio = l.negocio as { nome?: string; slug?: string | null; ativo?: boolean } | null
    // já avaliou nesse meio tempo? não incomoda
    const { data: avaliou } = await db.from('avaliacoes').select('id').eq('negocio_id', l.negocio_id).eq('autor_id', l.perfil_id).maybeSingle()
    if (negocio?.ativo && !avaliou) {
      await notificar(
        [l.perfil_id],
        {
          tipo: 'pedido_avaliacao',
          titulo: `Como foi em ${negocio.nome}?`,
          corpo: l.motivo === 'cupom' ? 'Você usou um cupom lá. Uma avaliação rápida ajuda a cidade toda.' : 'Você chamou no WhatsApp. Conta pra cidade como foi.',
          url: `/negocio/${negocio.slug || l.negocio_id}#t-aval`,
        },
        { categoria: 'lembretes' }
      )
      enviados++
    }
    await db.from('lembretes_avaliacao').update({ enviado_em: agora.toISOString() }).eq('perfil_id', l.perfil_id).eq('negocio_id', l.negocio_id)
  }
  return enviados
}

/** Véspera de evento: avisa quem marcou "Tenho interesse". */
export async function enviarLembretesEventos(agora = new Date()) {
  const db = createServiceClient()
  const ate = new Date(agora.getTime() + 36 * 3600e3).toISOString()
  const { data: eventos } = await db
    .from('avisos_cidade')
    .select('id, titulo, local_evento, data_evento')
    .eq('tipo', 'evento')
    .eq('ativo', true)
    .gt('data_evento', agora.toISOString())
    .lte('data_evento', ate)
  let enviados = 0
  for (const e of eventos ?? []) {
    const { data: interessados } = await db.from('interesses_evento').select('perfil_id').eq('aviso_id', e.id).is('lembrado_em', null)
    const ids = (interessados ?? []).map((i) => i.perfil_id as string)
    if (ids.length === 0) continue
    const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(e.data_evento!))
    await notificar(
      ids,
      { tipo: 'lembrete_evento', titulo: `Amanhã: ${e.titulo}`, corpo: `${hora}${e.local_evento ? ` · ${e.local_evento}` : ''}`, url: `/agenda#evento-${e.id}` },
      { categoria: 'lembretes' }
    )
    await db.from('interesses_evento').update({ lembrado_em: agora.toISOString() }).eq('aviso_id', e.id).in('perfil_id', ids)
    enviados += ids.length
  }
  return enviados
}

/** Segunda-feira: resumo da semana pra cada dono de negócio com movimento. */
export async function enviarResumoSemanalLojistas(agora = new Date()) {
  const diaSemana = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short' }).format(agora)
  if (diaSemana !== 'Mon') return 0
  const db = createServiceClient()
  const desde = new Date(agora.getTime() - 7 * 86400e3).toISOString()
  const { data: eventos } = await db.from('eventos_perfil').select('negocio_id, tipo').gte('criado_em', desde).limit(50000)
  const porNegocio = new Map<string, { visitas: number; whats: number; favoritos: number }>()
  for (const e of eventos ?? []) {
    const m = porNegocio.get(e.negocio_id) ?? { visitas: 0, whats: 0, favoritos: 0 }
    if (e.tipo === 'visualizacao') m.visitas++
    else if (e.tipo === 'clique_whatsapp') m.whats++
    else if (e.tipo === 'favorito') m.favoritos++
    porNegocio.set(e.negocio_id, m)
  }
  if (porNegocio.size === 0) return 0
  const { data: negocios } = await db
    .from('negocios')
    .select('id, nome, reivindicado_por')
    .in('id', Array.from(porNegocio.keys()))
    .not('reivindicado_por', 'is', null)
  let enviados = 0
  for (const n of negocios ?? []) {
    const m = porNegocio.get(n.id)!
    const partes = [
      `${m.visitas} ${m.visitas === 1 ? 'visita' : 'visitas'}`,
      `${m.whats} ${m.whats === 1 ? 'clique' : 'cliques'} no WhatsApp`,
      m.favoritos ? `${m.favoritos} ${m.favoritos === 1 ? 'novo favorito' : 'novos favoritos'}` : null,
    ].filter(Boolean)
    await notificar(
      [n.reivindicado_por as string],
      { tipo: 'resumo_semanal', titulo: `Sua semana em ${n.nome}`, corpo: `${partes.join(', ')}. Veja os detalhes no painel.`, url: '/painel/negocio/estatisticas' },
      { categoria: 'meu_negocio' }
    )
    enviados++
  }
  return enviados
}
