/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // fallback pra quando uma página não cacheada é aberta sem internet.
  // '/_offline' é o padrão do next-pwa (convenção do Pages Router) — no App
  // Router isso não vira rota, por isso apontamos direto pro HTML estático.
  fallbacks: {
    document: '/offline.html',
  },
  // next-pwa v5 inclui /_next/app-build-manifest.json no precache por padrão,
  // mas esse arquivo é uso interno do Next (App Router) e nunca é servido
  // publicamente (404) — o workbox tentava buscá-lo durante a instalação do
  // service worker, a instalação inteira falhava por causa desse único
  // arquivo, e o SW nunca ficava "active". Resultado: nenhum usuário real
  // jamais teve o service worker funcionando (achado via teste E2E real de
  // push notification, não em code review — sem esse teste, ficaria
  // invisível pra sempre, já que o app continua funcionando normal sem SW,
  // só sem push/offline).
  buildExcludes: [/app-build-manifest\.json$/],
})

// CSP pensada pro que o app de fato usa: fontes self-hosted (next/font), imagens
// do Supabase Storage + Google Places, chamadas à API REST do Supabase.
// 'unsafe-inline' em style-src é necessário porque várias animações usam
// `style={{ '--i': ... }}` inline.
//
// 'unsafe-inline' em script-src: o Next.js App Router injeta scripts inline pro
// próprio bootstrap de hidratação (payload de streaming SSR, __next_f.push(...)).
// Sem isso o React nunca hidrata e TODO formulário/botão client-side para de
// funcionar (achado via teste E2E real em navegador — script-src 'self' sozinho
// bloqueava silenciosamente esses scripts, sem gerar erro visível pro usuário).
// O caminho mais seguro seria CSP por nonce via middleware, mas o middleware.ts
// já foi removido antes por incompatibilidade com o Edge Runtime — 'unsafe-inline'
// é o meio-termo até isso ser reavaliado com mais calma.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com https://maps.googleapis.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = withPWA(nextConfig)
