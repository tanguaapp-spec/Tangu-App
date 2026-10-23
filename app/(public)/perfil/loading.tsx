import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoVoce() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 pb-8 pt-5 md:pt-10">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-[20px]" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-[22px]" />
      <Skeleton className="h-72 w-full rounded-[20px]" />
    </div>
  )
}
