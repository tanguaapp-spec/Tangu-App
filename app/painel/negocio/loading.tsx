import { Skeleton } from '@/components/ui/skeleton'

export default function CarregandoPainel() {
  return (
    <div className="mx-auto max-w-3xl">
      <Skeleton className="h-32 w-full rounded-[28px] bg-barro-100" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-8 h-40 w-full rounded-casca" />
      <Skeleton className="mt-8 h-56 w-full rounded-casca" />
      <Skeleton className="mt-8 h-40 w-full rounded-casca" />
    </div>
  )
}
