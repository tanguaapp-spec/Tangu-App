/**
 * Vibração tátil leve em ações-chave (favoritar, carimbar, denunciar...).
 * Só Android/Chrome tem a Vibration API — iOS Safari nunca teve suporte e
 * não deve ganhar, então isso é 100% "progressive enhancement": nos
 * aparelhos sem suporte, a chamada simplesmente não faz nada.
 */
export function vibrar(padrao: number | number[] = 12) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(padrao)
  } catch {
    // alguns navegadores lançam se chamado fora de um gesto do usuário — ignora
  }
}
