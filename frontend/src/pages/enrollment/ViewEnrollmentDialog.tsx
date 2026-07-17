import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/progress'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Branch, Enrollment } from '@/lib/types'

/** Read-only detail view, opened by clicking a row in the list. */
export function ViewEnrollmentDialog({
  enrollment,
  batchNameById,
  onClose,
  onEdit,
}: {
  enrollment: Enrollment | null
  batchNameById: Map<string, string>
  onClose: () => void
  onEdit: (e: Enrollment) => void
}) {
  const open = !!enrollment

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  if (!enrollment) return null

  const e = enrollment
  const branchName = branches?.find((b) => b.id === e.branch_id)?.name
  const batchName = e.batch_id ? batchNameById.get(e.batch_id) : undefined

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={e.student_name}
      description="Enrollment details"
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" onClick={() => onEdit(e)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Fee summary up front — it's the thing you open this to check. */}
        <div className="rounded-lg border border-(--color-border) bg-(--color-muted) p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-(--color-foreground)">Fee collection</span>
            <StatusBadge status={e.fee_status} />
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2 text-sm tabular-nums">
            <span className="text-(--color-muted-foreground)">
              Paid <b className="text-(--color-foreground)">{formatCurrency(e.paid_amount)}</b> of{' '}
              {formatCurrency(e.total_fee)}
            </span>
            {e.pending_amount > 0 && (
              <span className="font-medium text-rose-600 dark:text-rose-400">
                {formatCurrency(e.pending_amount)} pending
              </span>
            )}
          </div>
          <Meter
            value={e.paid_amount}
            max={e.total_fee || e.paid_amount || 1}
            tone={e.fee_status === 'Paid' ? 'accent' : e.fee_status === 'Partial' ? 'warning' : 'danger'}
            size="sm"
            className="mt-2"
          />
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Mobile" value={e.mobile} mono />
          <Field label="Email" value={e.email} />
          <Field label="College / Institution" value={e.college} />
          <Field label="Program" value={e.program} />
          <Field label="Year of Study" value={e.year_of_study} />
          <Field label="Batch" value={batchName ?? 'Unassigned'} />
          <Field label="Enrollment Date" value={e.enrollment_date ? formatDate(e.enrollment_date) : null} />
          <Field label="Start Date" value={e.start_date ? formatDate(e.start_date) : null} />
          <Field label="End Date" value={e.end_date ? formatDate(e.end_date) : null} />
          <Field label="Branch" value={branchName} />
          <Field label="Created" value={formatDate(e.created_at)} />
        </dl>
      </div>
    </Dialog>
  )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-(--color-muted-foreground)">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm text-(--color-foreground) ${mono ? 'tabular-nums' : ''}`}
        title={value ?? undefined}
      >
        {value?.toString().trim() ? value : <span className="text-(--color-muted-foreground)">—</span>}
      </dd>
    </div>
  )
}
