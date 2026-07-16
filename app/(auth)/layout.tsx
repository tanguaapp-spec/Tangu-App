import Link from 'next/link'

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-feira textura-papel px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-casca-500 text-white font-display font-bold text-xl">
            T
          </span>
          <span className="font-display text-2xl font-semibold text-barro-900">
            Tanguá <span className="text-casca-500">App</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  )
}
