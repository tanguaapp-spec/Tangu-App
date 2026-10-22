import { headers } from 'next/headers'

/**
 * URL base do site pra links absolutos (e-mail, retorno do pagamento).
 * Prefere NEXT_PUBLIC_SITE_URL (fixa, não falsificável por header Host);
 * cai no host do request só em desenvolvimento/preview.
 */
export function urlDoSite(): string {
  const fixa = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  if (fixa) return fixa
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'tangua-app.vercel.app'
  const protocolo = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${protocolo}://${host}`
}

/** Só aceita caminho interno ("/painel"), nunca URL externa — evita open redirect. */
export function caminhoInternoSeguro(valor: string | null | undefined, padrao = '/'): string {
  if (!valor || !valor.startsWith('/') || valor.startsWith('//') || valor.includes('\\')) return padrao
  return valor
}
