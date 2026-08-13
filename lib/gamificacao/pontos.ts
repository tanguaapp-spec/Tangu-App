import { createServiceClient } from '@/lib/supabase/server'

export const MOTIVOS_PONTOS = {
  avaliacao: { quantidade: 10, rotulo: 'Avaliar um negócio' },
  favorito: { quantidade: 2, rotulo: 'Favoritar um negócio' },
  perfil_completo: { quantidade: 5, rotulo: 'Completar o perfil' },
  boas_vindas: { quantidade: 10, rotulo: 'Boas-vindas ao Tanguá App' },
  indicacao: { quantidade: 20, rotulo: 'Indicar um vizinho' },
} as const

export type MotivoPontos = keyof typeof MOTIVOS_PONTOS

/**
 * Credita pontos "Laranjas" pro perfil. Escreve via service role — a
 * tabela não tem policy de insert pra ninguém mais, de propósito (evita
 * qualquer forma de inflar o próprio saldo direto pela API). Nunca deve
 * travar a ação principal, por isso sempre falha em silêncio.
 */
export async function creditarPontos(perfilId: string, motivo: MotivoPontos) {
  try {
    const supabase = createServiceClient()
    await supabase.from('pontos_laranjas').insert({
      perfil_id: perfilId,
      quantidade: MOTIVOS_PONTOS[motivo].quantidade,
      motivo,
    })
  } catch (err) {
    console.error('Falha ao creditar pontos Laranjas:', err)
  }
}

/** Pra motivos "uma vez só" (ex: completar perfil, boas-vindas) — evita creditar de novo. */
export async function jaCreditouPontos(perfilId: string, motivo: MotivoPontos) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('pontos_laranjas')
    .select('id')
    .eq('perfil_id', perfilId)
    .eq('motivo', motivo)
    .limit(1)
    .maybeSingle()
  return !!data
}

export async function buscarSaldoLaranjas(perfilId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase.from('pontos_laranjas').select('quantidade').eq('perfil_id', perfilId)
  return (data ?? []).reduce((soma, linha) => soma + linha.quantidade, 0)
}
