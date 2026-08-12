import Link from 'next/link'
import { LogoTangua } from '@/components/marca/logo-tangua'

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-feira textura-papel px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <LogoTangua className="h-10 w-10" />
          <span className="font-display text-2xl font-semibold text-barro-900">
            Tanguá <span className="text-casca-500">App</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  )
}
