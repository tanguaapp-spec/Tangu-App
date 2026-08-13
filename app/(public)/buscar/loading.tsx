import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoBusca() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Skeleton className="h-9 w-72 max-w-full" />
      <Skeleton className="mt-3 h-5 w-48" />
      <Skeleton className="mt-6 h-14 w-full rounded-2xl" />
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-casca border border-barro-100 bg-white">
            <Skeleton className="h-40 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="mt-3 h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
