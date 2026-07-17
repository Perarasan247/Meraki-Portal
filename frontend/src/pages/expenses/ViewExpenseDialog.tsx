import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Branch, Expense } from '@/lib/types'

/** Read-only detail view, opened by clicking a row in the ledger. */
export function ViewExpenseDialog({
  expense,
  onClose,
  onEdit,
}: {
  expense: Expense | null
  onClose: () => void
  onEdit: (e: Expense) => void
}) {
  const open = !!expense

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  if (!expense) return null

  const e = expense
  const branchName = branches?.find((b) => b.id === e.branch_id)?.name

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={e.title}
      description="Expense details"
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
        {/* Amount up front — it's the thing you open this to check. */}
        <div className="rounded-lg border border-(--color-border) bg-(--color-muted) p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-(--color-foreground)">Amount</span>
            <StatusBadge status={e.status} />
          </div>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-(--color-foreground)">
            {formatCurrency(e.amount)}
          </p>
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-(--color-muted-foreground)">Category</dt>
            <dd className="mt-1"><Badge>{e.category}</Badge></dd>
          </div>
          <Field label="Date" value={formatDate(e.date)} />
          <Field label="Paid to / Vendor" value={e.vendor} />
          <Field label="Payment Method" value={e.payment_method} />
          <Field label="Invoice / Ref No." value={e.invoice_no} mono />
          <Field label="Branch" value={branchName} />
          <Field label="Recorded" value={formatDate(e.created_at)} />
        </dl>

        {/* Notes can run long, so they get their own full-width block. */}
        <div>
          <h4 className="text-xs font-medium text-(--color-muted-foreground)">Notes</h4>
          <p className="mt-1 whitespace-pre-wrap text-sm text-(--color-foreground)">
            {e.notes?.trim() ? e.notes : <span className="text-(--color-muted-foreground)">—</span>}
          </p>
        </div>
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
