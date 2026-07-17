import * as React from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-(--color-border)">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-(--color-muted)', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-(--color-border)', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('transition-colors hover:bg-(--color-muted)/60', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)',
        className,
      )}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />
}

export type SortDir = 'asc' | 'desc'
export interface SortState {
  by: string
  dir: SortDir
}

/** Toggle a column: clicking a new column sorts it ascending; clicking the
 *  active column flips direction. */
export function nextSort(current: SortState, column: string): SortState {
  if (current.by !== column) return { by: column, dir: 'asc' }
  return { by: column, dir: current.dir === 'asc' ? 'desc' : 'asc' }
}

/** A clickable column header that sorts by `column`. */
export function SortableHead({
  label, column, sort, onSort, className,
}: {
  label: string
  column: string
  sort: SortState
  onSort: (next: SortState) => void
  className?: string
}) {
  const active = sort.by === column
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <TableHead className={cn('p-0', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column))}
        className={cn(
          'flex h-10 w-full cursor-pointer items-center gap-1 px-4 text-left text-xs font-semibold uppercase tracking-wide transition-colors hover:text-(--color-foreground)',
          active ? 'text-(--color-foreground)' : 'text-(--color-muted-foreground)',
        )}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5 shrink-0', !active && 'opacity-40')} />
      </button>
    </TableHead>
  )
}
