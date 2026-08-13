import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoNegocio() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Skeleton className="mb-4 h-5 w-40" />
      <Skeleton className="h-56 w-full rounded-casca sm:h-72" />
      <div className="mt-6 grid gap-8 sm:grid-cols-3">
        <div className="space-y-3 sm:col-span-2">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="mt-4 h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-casca" />
          <Skeleton className="h-20 w-full rounded-casca" />
        </div>
      </div>
    </div>
  )
}
