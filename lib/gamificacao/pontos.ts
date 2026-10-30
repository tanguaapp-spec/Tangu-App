import { createServiceClient } from '@/lib/supabase/server'

export const MOTIVOS_PONTOS = {
  avaliacao: { quantidade: 10, rotulo: 'Avaliar um negócio', regra: 'uma vez por negócio' },
  favorito: { quantidade: 2, rotulo: 'Favoritar um negócio', regra: 'uma vez por negócio' },
  perfil_completo: { quantidade: 5, rotulo: 'Completar o perfil com seu bairro', regra: 'uma vez' },
  boas_vindas: { quantidade: 10, rotulo: 'Boas-vindas ao Tanguá App', regra: 'ao criar a conta' },
  indicacao: { quantidade: 20, rotulo: 'Indicar um vizinho', regra: 'quando ele confirma o e-mail' },
} as const

export type MotivoPontos = keyof typeof MOTIVOS_PONTOS

/**
 * Credita pontos "Laranjas" pro perfil. Escreve via service role — a
 * tabela não tem policy de insert pra ninguém mais, de propósito (evita
 * qualquer forma de inflar o próprio saldo direto pela API). Nunca deve
 * travar a ação principal, por isso sempre falha em silêncio.
 *
 * `referencia` = o que gerou o ponto (id do negócio favoritado/avaliado,
 * "unico" pra ações de uma vez só). Com ela, o banco (0029) recusa repetir
 * o mesmo ponto: desfavoritar e favoritar de novo não soma outra vez.
 * A indicação é creditada pelo próprio banco quando o indicado confirma o e-mail.
 */
export async function creditarPontos(perfilId: string, motivo: MotivoPontos, referencia?: string) {
  try {
    const supabase = createServiceClient()
    const linha = { perfil_id: perfilId, quantidade: MOTIVOS_PONTOS[motivo].quantidade, motivo }
    if (!referencia) {
      await supabase.from('pontos_laranjas').insert(linha)
      return
    }
    // antes da 0029 a coluna não existe: confere na mão se já ganhou por isso
    const { error } = await supabase.from('pontos_laranjas').insert({ ...linha, referencia })
    if (error && error.code !== '23505' && /referencia/.test(error.message)) {
      if (motivo === 'favorito' || !(await jaCreditouPontos(perfilId, motivo))) await supabase.from('pontos_laranjas').insert(linha)
    }
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
