import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoPerfil() {
  return (
    <div className="mx-auto max-w-3xl pb-10">
      <div className="rounded-b-[28px] bg-barro-900 px-4 pb-6 pt-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-2xl bg-white/15" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 bg-white/15" />
            <Skeleton className="h-3 w-24 bg-white/15" />
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6">
        <Skeleton className="-mt-4 mb-6 h-20 w-full rounded-2xl" />
        <Skeleton className="mb-2 h-4 w-20" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="mt-6 h-32 w-full rounded-casca" />
        <Skeleton className="mt-6 h-64 w-full rounded-casca" />
      </div>
    </div>
  )
}
