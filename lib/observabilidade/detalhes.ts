/** Navegador e sistema legíveis a partir do user-agent (sem guardar o texto inteiro). */
export function lerUserAgent(ua: string | null | undefined) {
  const t = ua ?? ''
  const sistema = /iPhone|iPad|iPod/.test(t)
    ? `iOS ${t.match(/OS (\d+)[_.](\d+)/)?.slice(1).join('.') ?? ''}`.trim()
    : /Android/.test(t)
      ? `Android ${t.match(/Android (\d+(\.\d+)?)/)?.[1] ?? ''}`.trim()
      : /Windows/.test(t)
        ? 'Windows'
        : /Mac OS X/.test(t)
          ? 'macOS'
          : /Linux/.test(t)
            ? 'Linux'
            : 'desconhecido'
  const navegador = /SamsungBrowser\/(\d+)/.test(t)
    ? `Samsung Internet ${RegExp.$1}`
    : /Edg\/(\d+)/.test(t)
      ? `Edge ${RegExp.$1}`
      : /OPR\/(\d+)/.test(t)
        ? `Opera ${RegExp.$1}`
        : /(?:Chrome|CriOS)\/(\d+)/.test(t)
          ? `Chrome ${RegExp.$1}`
          : /(?:Firefox|FxiOS)\/(\d+)/.test(t)
            ? `Firefox ${RegExp.$1}`
            : /Version\/(\d+).*Safari/.test(t)
              ? `Safari ${RegExp.$1}`
              : 'desconhecido'
  return { navegador, sistema, celular: /Mobi|Android|iPhone/.test(t) }
}

/** Onde o app está rodando e qual versão (pra saber se o erro é de produção e se já foi corrigido). */
export function ambienteAtual() {
  return {
    ambiente: process.env.VERCEL_ENV ?? (process.env.NODE_ENV === 'production' ? 'produção (local)' : 'desenvolvimento'),
    versao: (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    regiao: process.env.VERCEL_REGION ?? null,
  }
}
