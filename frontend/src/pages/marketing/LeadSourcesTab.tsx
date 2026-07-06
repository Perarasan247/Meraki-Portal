import { Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import type { LeadSourceAggregate } from '@/lib/types'

export function LeadSourcesTab({ leadSources, isLoading }: { leadSources: LeadSourceAggregate[]; isLoading: boolean }) {
  const max = Math.max(1, ...leadSources.map((s) => s.count))

  return (
    <Card>
      <CardHeader><CardTitle>Lead Source Breakdown</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : leadSources.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No lead source data yet."
            description="Tag enquiries with a campaign source."
          />
        ) : (
          <div className="space-y-3">
            {leadSources.map((s) => (
              <div key={s.source_name} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-(--color-muted-foreground)">{s.source_name}</span>
                <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                  <div
                    className="h-2.5 rounded-full bg-(--color-primary) transition-all"
                    style={{ width: `${(s.count / max) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium tabular-nums">{s.count}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
