import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoBusca() {
  return (
    <div className="md:mx-auto md:max-w-[1200px] md:px-6 md:pt-8">
      <div className="flex flex-col gap-3 border-b border-barro-200/80 bg-superficie px-5 pb-3 pt-4 md:rounded-[28px] md:border md:p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-12 w-full rounded-[14px]" />
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 shrink-0 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 px-5 pt-4 md:grid-cols-2 md:px-0 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-[20px] border border-barro-200/80 bg-superficie p-3">
            <Skeleton className="h-[76px] w-[76px] shrink-0 rounded-2xl" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
