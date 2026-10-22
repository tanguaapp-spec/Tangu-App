import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatarTelefoneWhatsapp(numero: string) {
  const limpo = numero.replace(/\D/g, '')
  return limpo.startsWith('55') ? limpo : `55${limpo}`
}

export function linkWhatsapp(numero: string, mensagem?: string) {
  const tel = formatarTelefoneWhatsapp(numero)
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${tel}${texto}`
}

export function formatarDistancia(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

export function formatarPrecoBRL(preco: number, aPartirDe = false) {
  const valor = preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  return aPartirDe ? `a partir de ${valor}` : valor
}

/**
 * Só devolve URLs http(s) — qualquer outra coisa (javascript:, data:, etc.)
 * vira null. Usar SEMPRE que um link digitado por usuário for pro href.
 */
export function urlSegura(valor: string | null | undefined): string | null {
  if (!valor) return null
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** "meusite.com.br" → "https://meusite.com.br"; inválido → null. */
export function normalizarSite(valor: string | null | undefined): string | null {
  const limpo = valor?.trim()
  if (!limpo) return null
  const comProtocolo = /^[a-z][a-z0-9+.-]*:/i.test(limpo) ? limpo : `https://${limpo}`
  const segura = urlSegura(comProtocolo)
  return segura && /^https?:\/\/[^\s/]+\.[^\s/]+/i.test(segura) ? segura : null
}

/** Instagram: aceita "@loja", "loja" ou a URL do perfil → "loja". */
export function normalizarInstagram(valor: string | null | undefined): string | null {
  const limpo = valor?.trim()
  if (!limpo) return null
  const usuario = limpo
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/.*$/, '')
  return /^[a-z0-9._]{1,30}$/i.test(usuario) ? usuario : null
}

/** Só dígitos, com DDD; aceita +55. Inválido → null. */
export function normalizarTelefoneBR(valor: string | null | undefined): string | null {
  const digitos = valor?.replace(/\D/g, '') ?? ''
  const semPais = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos
  return semPais.length === 10 || semPais.length === 11 ? semPais : null
}
