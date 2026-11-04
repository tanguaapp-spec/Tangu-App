import { normalizar } from '@/lib/importacao/listas'

/**
 * "Max Gym Academia", "max gym  academia." e "Máx Gym Academia" viram a
 * mesma chave. Mesma regra da função normalizar_nome do banco (0030).
 */
export function chaveNome(nome: string | null | undefined) {
  return normalizar(nome ?? '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Só os dígitos do celular, sem o 55 do país: "(21) 99999-0000" → "21999990000". Vazio se não parece telefone. */
export function chaveTelefone(tel: string | null | undefined) {
  const d = (tel ?? '').replace(/\D/g, '').replace(/^0+/, '')
  const local = d.startsWith('55') && d.length >= 12 ? d.slice(2) : d
  return local.length >= 10 ? local : ''
}

export type NegocioComparavel = {
  id: string
  nome: string
  whatsapp?: string | null
  telefone?: string | null
  reivindicado_por?: string | null
  criado_em?: string
}

/**
 * Grupos de possíveis repetidos: mesmo nome (normalizado) ou mesmo número
 * de WhatsApp/telefone. Cada negócio aparece em no máximo um grupo; dentro
 * do grupo, o mais antigo vem primeiro (é o que normalmente se mantém).
 */
export function agruparDuplicados<T extends NegocioComparavel>(negocios: T[]): { motivo: 'nome' | 'telefone'; chave: string; itens: T[] }[] {
  const usados = new Set<string>()
  const grupos: { motivo: 'nome' | 'telefone'; chave: string; itens: T[] }[] = []
  const ordenar = (a: T, b: T) => (a.criado_em ?? '').localeCompare(b.criado_em ?? '')

  const porNome = new Map<string, T[]>()
  for (const n of negocios) {
    const k = chaveNome(n.nome)
    if (k) porNome.set(k, [...(porNome.get(k) ?? []), n])
  }
  for (const [chave, itens] of Array.from(porNome.entries())) {
    if (itens.length < 2) continue
    itens.forEach((n) => usados.add(n.id))
    grupos.push({ motivo: 'nome', chave, itens: itens.sort(ordenar) })
  }

  const porTelefone = new Map<string, T[]>()
  for (const n of negocios) {
    if (usados.has(n.id)) continue
    const telefones = new Set([chaveTelefone(n.whatsapp), chaveTelefone(n.telefone)].filter(Boolean))
    for (const t of Array.from(telefones)) porTelefone.set(t, [...(porTelefone.get(t) ?? []), n])
  }
  for (const [chave, itens] of Array.from(porTelefone.entries())) {
    const livres = itens.filter((n) => !usados.has(n.id))
    if (livres.length < 2) continue
    livres.forEach((n) => usados.add(n.id))
    grupos.push({ motivo: 'telefone', chave, itens: livres.sort(ordenar) })
  }
  return grupos
}
