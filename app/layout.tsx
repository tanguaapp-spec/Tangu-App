import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import { RegistrarServiceWorker } from '@/components/pwa/registrar-service-worker'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://tangua-app.vercel.app'),
  title: {
    template: '%s | Tanguá App',
    default: 'Tanguá App — A cidade em um só lugar',
  },
  description:
    'Encontre profissionais e comércios de Tanguá, vagas de emprego e tudo o que acontece na cidade.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://tangua-app.vercel.app',
    siteName: 'Tanguá App',
    title: 'Tanguá App — A cidade em um só lugar',
    description:
      'Encontre profissionais e comércios de Tanguá, vagas de emprego e tudo o que acontece na cidade.',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@tanguaapp',
  },
}

export const viewport: Viewport = {
  themeColor: '#EF7A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body antialiased">
        <RegistrarServiceWorker />
        {children}
      </body>
    </html>
  )
}
