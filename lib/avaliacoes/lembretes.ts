import { createServiceClient } from '@/lib/supabase/server'

// Fora de arquivo 'use server' de propósito: não vira endpoint chamável
// pelo navegador (senão qualquer um agendaria lembrete pra qualquer pessoa).

/**
 * Agenda o pedido de avaliação ("Como foi na X?") pra 2 dias depois de a
 * pessoa chamar no WhatsApp ou usar um cupom. Só se ainda não avaliou.
 * O cron diário envia (app/api/cron/resumo-diario).
 */
export async function agendarLembreteAvaliacao(perfilId: string, negocioId: string, motivo: 'cupom' | 'whatsapp') {
  try {
    const db = createServiceClient()
    const { data: jaAvaliou } = await db.from('avaliacoes').select('id').eq('negocio_id', negocioId).eq('autor_id', perfilId).maybeSingle()
    if (jaAvaliou) return
    await db
      .from('lembretes_avaliacao')
      .upsert(
        { perfil_id: perfilId, negocio_id: negocioId, motivo, enviar_apos: new Date(Date.now() + 2 * 86400e3).toISOString() },
        { onConflict: 'perfil_id,negocio_id', ignoreDuplicates: true }
      )
  } catch (err) {
    console.error('Falha ao agendar lembrete de avaliação:', err)
  }
}

