/**
 * Só aceita endereços dos serviços de push dos navegadores de verdade
 * (Chrome/Android, Firefox, Safari/iPhone, Edge). Evita que alguém cadastre
 * um endereço qualquer e faça o servidor mandar requisições pra ele.
 */
const SERVICOS = [
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /(^|\.)push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /(^|\.)notify\.windows\.com$/,
  /(^|\.)push\.apple\.com$/,
]

export function endpointPushValido(endpoint: string) {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && SERVICOS.some((s) => s.test(url.hostname))
  } catch {
    return false
  }
}
