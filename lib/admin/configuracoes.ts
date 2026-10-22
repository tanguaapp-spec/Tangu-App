import { z } from 'zod'

export const SECOES_HOME = ['ofertas', 'novidades', 'populares', 'profissionais', 'eventos', 'anuncie'] as const

/**
 * Catálogo das configurações editáveis pelo painel — só estas chaves podem
 * ser gravadas, cada uma com seu validador. Chave nova = adicionar aqui E
 * semear em migration.
 */
export const DEFINICOES_CONFIG = {
  moderacao_previa_negocios: {
    rotulo: 'Revisar todo cadastro de negócio antes de publicar',
    ajuda: 'Desligado (recomendado): cadastros entram no ar na hora e só os sinalizados por regra automática vão pra revisão.',
    tipo: 'booleano',
    validador: z.boolean(),
  },
  termos_sinalizados: {
    rotulo: 'Palavras que mandam o cadastro pra revisão',
    ajuda: 'Uma por linha. Ex.: pirâmide, renda extra garantida.',
    tipo: 'lista',
    validador: z.array(z.string().trim().min(2).max(60)).max(200),
  },
  max_cadastros_negocio_por_hora: {
    rotulo: 'Cadastros de negócio por hora antes de segurar pra revisão',
    ajuda: 'Proteção contra cadastro automatizado em massa.',
    tipo: 'inteiro',
    validador: z.number().int().min(1).max(1000),
  },
  assinatura_tolerancia_dias: {
    rotulo: 'Dias de tolerância após cobrança recusada',
    ajuda: 'Durante esse prazo o plano pago continua valendo enquanto o Mercado Pago tenta cobrar de novo.',
    tipo: 'inteiro',
    validador: z.number().int().min(0).max(30),
  },
  suporte_email: {
    rotulo: 'E-mail de suporte exibido na central de ajuda',
    ajuda: 'Deixe vazio pra mostrar só o formulário de chamado.',
    tipo: 'texto',
    validador: z.union([z.literal(''), z.string().trim().email().max(200)]),
  },
  home_ordem_secoes: {
    rotulo: 'Ordem das seções da página inicial',
    ajuda: `Uma por linha, usando: ${SECOES_HOME.join(', ')}. Seções fora da lista ficam escondidas.`,
    tipo: 'lista',
    validador: z.array(z.enum(SECOES_HOME)).min(1).max(SECOES_HOME.length),
  },
} as const

export type ChaveConfig = keyof typeof DEFINICOES_CONFIG

/** Converte o texto do formulário pro valor tipado e valida. */
export function interpretarConfig(chave: string, bruto: string): { valor: unknown } | { erro: string } {
  if (!(chave in DEFINICOES_CONFIG)) return { erro: 'Configuração desconhecida.' }
  const def = DEFINICOES_CONFIG[chave as ChaveConfig]
  let valor: unknown
  switch (def.tipo) {
    case 'booleano':
      valor = bruto === 'true' || bruto === 'on'
      break
    case 'inteiro':
      valor = Number(bruto)
      break
    case 'lista':
      valor = Array.from(new Set(bruto.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean)))
      break
    default:
      valor = bruto.trim()
  }
  const r = (def.validador as z.ZodTypeAny).safeParse(valor)
  return r.success ? { valor: r.data } : { erro: `${def.rotulo}: valor inválido.` }
}

const limite = z.union([z.null(), z.number().int().min(0).max(100000)])

export const schemaPlano = z.object({
  id: z.string().regex(/^[a-z0-9_]{2,30}$/, 'Identificador: só letras minúsculas, números e _.'),
  nome: z.string().trim().min(2).max(40),
  descricao: z.string().trim().max(200).optional().default(''),
  preco_centavos: z.number().int().min(0, 'Preço não pode ser negativo.').max(1_000_000, 'Preço alto demais.'),
  ativo: z.boolean(),
  ordem: z.number().int().min(0).max(100),
  limites: z.object({
    max_produtos: limite,
    max_cupons_ativos: limite,
    max_posts_mes: limite,
    max_fotos_galeria: limite,
  }),
  recursos: z.object({
    estatisticas_avancadas: z.boolean(),
    destaque_busca: z.boolean(),
  }),
})

/** "" ou "ilimitado" → null; número → inteiro. */
export function lerLimite(bruto: FormDataEntryValue | null): number | null | typeof NaN {
  const t = String(bruto ?? '').trim().toLowerCase()
  if (t === '' || t === 'ilimitado') return null
  return Number(t)
}

/** "39,90" / "39.90" / "R$ 39,90" → 3990 centavos. */
export function lerPrecoCentavos(bruto: FormDataEntryValue | null): number {
  const t = String(bruto ?? '').replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  if (t === '') return 0
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}
