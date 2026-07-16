import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'

/**
 * Compact pagination bar for server-paginated list tables. Renders nothing when
 * everything fits on one page.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-(--color-muted-foreground)">
        Showing <b className="tabular-nums text-(--color-foreground)">{from}–{to}</b> of{' '}
        <b className="tabular-nums text-(--color-foreground)">{total}</b>
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </Button>
        <span className="px-2 tabular-nums text-(--color-muted-foreground)">
          Page {page} / {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
