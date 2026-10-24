import type { Metadata, Viewport } from 'next'
import { Familjen_Grotesk, Figtree, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { RegistrarServiceWorker } from '@/components/pwa/registrar-service-worker'
import { SplashScreen } from '@/components/pwa/splash-screen'
import { SCRIPT_TEMA_INICIAL } from '@/lib/tema/preferencia'
import { SincronizarTema } from '@/components/tema/sincronizar-tema'
import './globals.css'

// Identidade "Tanguá" (out/2026): títulos, texto e números/códigos.
const familjen = Familjen_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
})

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['500', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://tangua-app.vercel.app'),
  title: {
    template: '%s | Tanguá App',
    default: 'Tanguá App — Tudo de Tanguá, perto de você',
  },
  description:
    'Comércios, profissionais, ofertas e o que acontece em Tanguá. Fale direto no WhatsApp, sem intermediário.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://tangua-app.vercel.app',
    siteName: 'Tanguá App',
    title: 'Tanguá App — Tudo de Tanguá, perto de você',
    description:
      'Comércios, profissionais, ofertas e o que acontece em Tanguá. Fale direto no WhatsApp, sem intermediário.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@tanguaapp',
  },
}

export const viewport: Viewport = {
  // cor da barra do navegador/app instalado = verde do cabeçalho em cada tema
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0E4D3A' },
    { media: '(prefers-color-scheme: dark)', color: '#0B2A20' },
  ],
  width: 'device-width',
  initialScale: 1,
  // comportamento de app instalado: sem zoom de pinça/toque duplo
  maximumScale: 1,
  userScalable: false,
  // sem viewportFit "cover" de propósito: no Safari a área segura de baixo
  // alterna entre 0 e 34px quando a barra do navegador some/aparece ao rolar,
  // e a nossa barra inferior crescia e encolhia junto ("se mexendo")
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${familjen.variable} ${figtree.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* aplica claro/escuro antes da primeira pintura (sem flash de tema errado) */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA_INICIAL }} />
        {/* o Chrome avisa "dá pra instalar" logo no começo; guarda pro convite de instalação usar depois */}
        <script
          dangerouslySetInnerHTML={{
            __html: "window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__tanguaInstalar=e;window.dispatchEvent(new Event('tangua-pode-instalar'))});",
          }}
        />
      </head>
      <body className="font-body antialiased">
        <SincronizarTema />
        <SplashScreen />
        <RegistrarServiceWorker />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
