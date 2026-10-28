import { cacheRequisicao as cache } from '@/lib/cache-requisicao'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'

/** Valores usados enquanto a migration 0023 não rodou (ou a chave foi apagada). */
const PADROES = {
  max_negocios_por_dono: 5,
  whatsapp_comercial: '',
  modulos_ativos: {
    agenda_whatsapp: true,
    pedidos_whatsapp: true,
    noticias: true,
    servicos_uteis: true,
    mapa: true,
    mural: true,
    vagas: true,
    orcamentos: true,
    nps: true,
  } as Record<string, boolean>,
  max_push_opcional_dia: 3,
  fontes_noticias: [] as string[],
  link_beloo: 'https://beloo-xzdr.vercel.app',
  link_fregues: 'https://card-pio-digital-hazel.vercel.app',
}
export type ChaveConfigLida = keyof typeof PADROES

/** Todas as configurações de uma vez, por request (só no servidor). */
const todas = cache(async () => {
  const { data } = await createServiceClient().from('configuracoes_sistema').select('chave, valor')
  return new Map<string, unknown>((data ?? []).map((l) => [l.chave as string, l.valor as unknown]))
})

export async function lerConfig<K extends ChaveConfigLida>(chave: K): Promise<(typeof PADROES)[K]> {
  const valor = (await todas().catch(() => new Map<string, unknown>())).get(chave)
  if (valor === undefined || valor === null) return PADROES[chave]
  if (chave === 'modulos_ativos') return { ...PADROES.modulos_ativos, ...(valor as object) } as (typeof PADROES)[K]
  return valor as (typeof PADROES)[K]
}

/** Parte do app ligada em Admin → Recursos do app (padrão: ligada). */
export async function moduloAtivo(modulo: string) {
  const modulos = await lerConfig('modulos_ativos')
  return modulos[modulo] !== false
}

/** Página de um módulo desligado responde "não encontrado" (como se não existisse). */
export async function exigirModulo(modulo: string) {
  if (!(await moduloAtivo(modulo))) notFound()
}
