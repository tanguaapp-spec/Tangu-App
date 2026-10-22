import Link from 'next/link'
import { MarcaTangua } from '@/components/marca/logo-tangua'

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-feira textura-papel px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <MarcaTangua tamanho="lg" className="text-mata-700" />
          <span className="sr-only">Tanguá App — página inicial</span>
        </Link>
        {children}
      </div>
    </div>
  )
}
