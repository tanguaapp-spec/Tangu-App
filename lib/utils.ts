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
