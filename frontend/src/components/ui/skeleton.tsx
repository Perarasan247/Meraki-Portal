import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-(--color-muted)', className)} />
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}
