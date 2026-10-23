/**
 * Agrupa registros de erro iguais (mesma mensagem, ignorando ids, números e
 * códigos que mudam a cada ocorrência), pra tela mostrar "aconteceu 37
 * vezes em 4 páginas" em vez de 37 linhas repetidas.
 */
export type RegistroErro = {
  id: string
  nivel: string
  mensagem: string
  contexto: string | null
  stack: string | null
  url: string | null
  usuario_id: string | null
  criado_em: string
  resolvido_em?: string | null
  nota_resolucao?: string | null
}

export type GrupoErro = {
  chave: string
  mensagem: string
  nivel: string
  ids: string[]
  total: number
  primeiro: string
  ultimo: string
  contextos: string[]
  urls: string[]
  usuarios: number
  stack: string | null
  resolvido: boolean
  resolvidoEm: string | null
  nota: string | null
}

export function chaveErro(mensagem: string) {
  return mensagem
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\b\d+\b/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/** Caminho sem o domínio e sem a parte que muda (id/slug do negócio, etc.). */
export function rotaDoErro(url: string | null) {
  if (!url) return null
  try {
    return new URL(url, 'https://x').pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '[id]')
  } catch {
    return url.slice(0, 120)
  }
}

export function agruparErros(registros: RegistroErro[]): GrupoErro[] {
  const grupos = new Map<string, GrupoErro & { _usuarios: Set<string> }>()
  // um grupo só conta como resolvido se TODAS as ocorrências estão resolvidas
  for (const r of registros) {
    const chave = `${r.nivel}|${chaveErro(r.mensagem)}`
    let g = grupos.get(chave)
    if (!g) {
      g = {
        chave,
        mensagem: r.mensagem,
        nivel: r.nivel,
        ids: [],
        total: 0,
        primeiro: r.criado_em,
        ultimo: r.criado_em,
        contextos: [],
        urls: [],
        usuarios: 0,
        stack: r.stack,
        resolvido: true,
        resolvidoEm: null,
        nota: null,
        _usuarios: new Set(),
      }
      grupos.set(chave, g)
    }
    g.ids.push(r.id)
    g.total++
    if (r.criado_em < g.primeiro) g.primeiro = r.criado_em
    if (r.criado_em > g.ultimo) {
      g.ultimo = r.criado_em
      g.mensagem = r.mensagem
      g.stack = r.stack ?? g.stack
    }
    if (r.contexto && !g.contextos.includes(r.contexto)) g.contextos.push(r.contexto)
    const rota = rotaDoErro(r.url)
    if (rota && !g.urls.includes(rota)) g.urls.push(rota)
    if (r.usuario_id) g._usuarios.add(r.usuario_id)
    if (!r.resolvido_em) g.resolvido = false
    else if (!g.resolvidoEm || r.resolvido_em > g.resolvidoEm) {
      g.resolvidoEm = r.resolvido_em
      g.nota = r.nota_resolucao ?? null
    }
  }
  return Array.from(grupos.values())
    .map(({ _usuarios, ...g }) => ({ ...g, usuarios: _usuarios.size, resolvidoEm: g.resolvido ? g.resolvidoEm : null }))
    .sort((a, b) => Number(a.resolvido) - Number(b.resolvido) || b.ultimo.localeCompare(a.ultimo))
}
