import { Skeleton } from "@/components/ui/skeleton"

function KanbanColumnSkeleton() {
  return (
    <div className="flex w-72 shrink-0 flex-col gap-0">
      <div className="rounded-t-xl border border-b-0 border-pf-border bg-pf-surface px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-5 rounded-full" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      <div className="flex flex-col gap-2 rounded-b-xl border border-t-0 border-pf-border bg-pf-surface/50 p-2.5 min-h-[120px]">
        {Array.from({ length: Math.floor(Math.random() * 2) + 1 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-pf-border bg-pf-surface p-3">
            <Skeleton className="mb-2 h-4 w-4/5" />
            <Skeleton className="mb-3 h-3 w-1/2" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PipelineLoading() {
  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </div>

      <div className="flex gap-4 overflow-hidden pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <KanbanColumnSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
