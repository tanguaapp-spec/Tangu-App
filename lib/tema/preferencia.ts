export type PreferenciaTema = 'claro' | 'escuro' | 'sistema'
export const CHAVE_TEMA = 'tangua-tema'

/**
 * Roda no <head> antes da página pintar: aplica html.dark conforme a
 * preferência salva (ou a do sistema), sem o "flash" de tema errado.
 * String pura (vai num <script> inline — a CSP já permite inline).
 */
export const SCRIPT_TEMA_INICIAL = `(function(){try{var p=localStorage.getItem('${CHAVE_TEMA}')||'sistema';var e=p==='escuro'||(p==='sistema'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',e);}catch(_){}})();`

export function temaEfetivoEscuro(preferencia: PreferenciaTema, sistemaEscuro: boolean) {
  return preferencia === 'escuro' || (preferencia === 'sistema' && sistemaEscuro)
}

export function aplicarTema(preferencia: PreferenciaTema) {
  const raiz = document.documentElement
  const escuro = temaEfetivoEscuro(preferencia, window.matchMedia('(prefers-color-scheme: dark)').matches)
  raiz.classList.add('trocando-tema')
  raiz.classList.toggle('dark', escuro)
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) meta.setAttribute('content', escuro ? '#0B2A20' : '#0E4D3A')
  // libera as transições no frame seguinte
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('trocando-tema')))
  try {
    localStorage.setItem(CHAVE_TEMA, preferencia)
  } catch {
    // modo privado/armazenamento bloqueado: vale só nesta visita
  }
}

export function lerPreferencia(): PreferenciaTema {
  try {
    const v = localStorage.getItem(CHAVE_TEMA)
    return v === 'claro' || v === 'escuro' ? v : 'sistema'
  } catch {
    return 'sistema'
  }
}
