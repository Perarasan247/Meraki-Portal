import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { Branch, Campaign, Enquiry } from '@/lib/types'

/** Read-only detail view — shows everything, including fields the table omits. */
export function ViewEnquiryDialog({
  enquiry,
  onClose,
  onEdit,
}: {
  enquiry: Enquiry | null
  onClose: () => void
  onEdit: (e: Enquiry) => void
}) {
  const open = !!enquiry

  // Resolve the ids the record stores into readable names.
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => api.get<Campaign[]>('/marketing/campaigns'),
    enabled: open,
    retry: false,
  })

  if (!enquiry) return null

  const branchName = branches?.find((b) => b.id === enquiry.branch_id)?.name
  const campaignName = campaigns?.find((c) => c.id === enquiry.campaign_id)?.name

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={enquiry.student_name}
      description="Enquiry details"
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" onClick={() => onEdit(enquiry)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{enquiry.status}</Badge>
          <Badge variant="default">{enquiry.enquiry_type ?? 'Internship'}</Badge>
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Mobile" value={enquiry.mobile} mono />
          <Field label="Email" value={enquiry.email} />
          <Field label="College / Institution" value={enquiry.college} />
          <Field label="Program of Interest" value={enquiry.program} />
          <Field label="Year of Study" value={enquiry.year_of_study} />
          <Field label="Reference By" value={enquiry.reference_source} />
          <Field label="Campaign / Lead Source" value={campaignName ?? 'None / Direct'} />
          <Field label="Branch" value={branchName} />
          <Field label="Created" value={formatDate(enquiry.created_at)} />
        </dl>

        <div>
          <dt className="text-xs font-medium text-(--color-muted-foreground)">Remarks / Notes</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-(--color-foreground)">
            {enquiry.notes?.trim() || <span className="text-(--color-muted-foreground)">—</span>}
          </dd>
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-(--color-muted-foreground)">{label}</dt>
      <dd className={`mt-0.5 truncate text-sm text-(--color-foreground) ${mono ? 'tabular-nums' : ''}`} title={value ?? undefined}>
        {value?.toString().trim() ? value : <span className="text-(--color-muted-foreground)">—</span>}
      </dd>
    </div>
  )
}
