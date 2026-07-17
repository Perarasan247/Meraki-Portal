import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/progress'
import { formatDate } from '@/lib/utils'
import type { Batch, Branch } from '@/lib/types'

/** Read-only detail view, opened by clicking a row in the list. */
export function ViewBatchDialog({
  batch,
  onClose,
  onEdit,
}: {
  batch: Batch | null
  onClose: () => void
  onEdit: (b: Batch) => void
}) {
  const open = !!batch

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  if (!batch) return null

  const b = batch
  const branchName = branches?.find((x) => x.id === b.branch_id)?.name
  const pct = b.seats_total > 0 ? (b.seats_filled / b.seats_total) * 100 : 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={b.batch_name}
      description="Batch details"
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" onClick={() => onEdit(b)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Seats up front — it's the thing you open this to check. */}
        <div className="rounded-lg border border-(--color-border) bg-(--color-muted) p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-(--color-foreground)">Seat capacity</span>
            <StatusBadge status={b.status} />
          </div>
          <div className="mt-2 text-sm tabular-nums text-(--color-muted-foreground)">
            <b className="text-(--color-foreground)">{b.seats_filled}</b> of {b.seats_total} seats filled
            {b.seats_total > 0 && <span className="ml-1">({Math.round(pct)}%)</span>}
          </div>
          <Meter
            value={b.seats_filled}
            max={b.seats_total || b.seats_filled || 1}
            tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'primary'}
            size="sm"
            className="mt-2"
          />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Program" value={b.program} />
          <div className="min-w-0">
            <dt className="text-xs font-medium text-(--color-muted-foreground)">Scope</dt>
            <dd className="mt-1"><Badge variant="default">{b.scope}</Badge></dd>
          </div>
          <Field label="Trainer" value={b.trainer ?? 'Unassigned'} />
          <Field label="Mode" value={b.mode} />
          <Field label="Venue / Platform" value={b.venue} />
          <Field label="Start Date" value={b.start_date ? formatDate(b.start_date) : null} />
          <Field label="End Date" value={b.end_date ? formatDate(b.end_date) : null} />
          <Field label="Branch" value={branchName} />
          <Field label="Created" value={formatDate(b.created_at)} />
        </dl>
      </div>
    </Dialog>
  )
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-(--color-muted-foreground)">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-(--color-foreground)" title={value ?? undefined}>
        {value?.toString().trim() ? value : <span className="text-(--color-muted-foreground)">—</span>}
      </dd>
    </div>
  )
}
