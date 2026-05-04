import { Skeleton } from "@/components/ui/skeleton"

function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="mb-2 h-7 w-20" />
      <Skeleton className="h-3 w-36" />
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-12 rounded-md" />
      </div>
      <Skeleton className="h-52 w-full rounded-lg" />
      <div className="mt-4 flex items-center justify-between border-t border-pf-border pt-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function ActivitySkeleton() {
  return (
    <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
      <div className="mb-3 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="size-7 shrink-0 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-1.5 h-3.5 w-52" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ChartSkeleton />
        </div>
        <div className="lg:col-span-2">
          <ActivitySkeleton />
        </div>
      </div>

      <div className="rounded-xl border border-pf-border bg-pf-surface p-5">
        <div className="mb-4 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-pf-border px-4 py-3">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
