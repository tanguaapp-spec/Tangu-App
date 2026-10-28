/**
 * Facebook do negócio: "https://www.facebook.com/padariasol/", "facebook.com/padariasol",
 * "@padariasol" ou "padariasol" → "padariasol". Vazio → null; inválido → false.
 */
export function lerFacebook(bruto: string | null): string | null | false {
  if (!bruto) return null
  const t = bruto
    .trim()
    .replace(/^(https?:\/\/)?(www\.|m\.)?(facebook|fb)\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
  return /^[A-Za-z0-9.\-_/?=]{2,100}$/.test(t) ? t : false
}
