import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { Select } from './input'

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50]

/**
 * Pagination bar for server-paginated tables.
 *
 * When a page-size selector is shown the bar stays visible even on a single
 * page — otherwise picking a large size would hide the control and strand the
 * user with no way to switch back.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  total: number
  onPage: (page: number) => void
  onPageSizeChange?: (size: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0) return null
  if (pages <= 1 && !onPageSizeChange) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-(--color-muted-foreground)">
        Showing <b className="tabular-nums text-(--color-foreground)">{from}–{to}</b> of{' '}
        <b className="tabular-nums text-(--color-foreground)">{total}</b>
      </span>

      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-(--color-muted-foreground)">
            Rows
            <Select
              aria-label="Rows per page"
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 w-auto py-0 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </label>
        )}

        {pages > 1 && (
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
        )}
      </div>
    </div>
  )
}
