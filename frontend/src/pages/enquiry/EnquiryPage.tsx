import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, MessagesSquare, CheckCircle2, Phone, ArrowRight } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import type { Enquiry, EnquiryStatus } from '@/lib/types'

const STATUSES: EnquiryStatus[] = ['New', 'Contacted', 'Interested', 'Converted']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

/** Move-forward target for each stage (Interested only moves via Convert). */
const NEXT_STATUS: Record<EnquiryStatus, EnquiryStatus | null> = {
  New: 'Contacted',
  Contacted: 'Interested',
  Interested: null,
  Converted: null,
}

/** Per-stage accent tone — keeps the board visually distinct from table sections. */
const STATUS_META: Record<EnquiryStatus, { accent: string; pill: string }> = {
  New: { accent: 'bg-cyan-500', pill: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
  Contacted: { accent: 'bg-amber-500', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  Interested: { accent: 'bg-indigo-500', pill: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  Converted: { accent: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
}

type UpdateStatusMutation = UseMutationResult<unknown, Error, { id: string; status: EnquiryStatus }, unknown>
type ConvertMutation = UseMutationResult<unknown, Error, string, unknown>

function useEnquiries() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['enquiries', branchParam],
    queryFn: () => api.get<Enquiry[]>(`/enquiries${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function EnquiryPage() {
  const [view, setView] = React.useState<'board' | 'list'>('board')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: enquiries, isLoading } = useEnquiries()
  const queryClient = useQueryClient()

  const stats = React.useMemo(() => {
    const list = enquiries ?? []
    return {
      total: list.length,
      new: list.filter((e) => e.status === 'New').length,
      contacted: list.filter((e) => e.status === 'Contacted').length,
      interested: list.filter((e) => e.status === 'Interested').length,
      converted: list.filter((e) => e.status === 'Converted').length,
    }
  }, [enquiries])

  const updateStatus: UpdateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) =>
      api.patch(`/enquiries/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  const convertMutation: ConvertMutation = useMutation({
    mutationFn: (id: string) => api.post(`/enquiries/${id}/convert`, { total_fee: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Converted to enrollment')
    },
    onError: () => toast.error('Conversion failed'),
  })

  async function handleExport() {
    try {
      await downloadExport('/enquiries/export', 'enquiries.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enquiry Pipeline"
        subtitle="Track leads from first contact to conversion"
        icon={MessagesSquare}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New Enquiry
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FunnelStrip stats={stats} />
        <div className="flex rounded-lg border border-(--color-border) p-1">
          {(['board', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-(--color-primary) text-(--color-primary-foreground)'
                  : 'text-(--color-muted-foreground) hover:bg-(--color-muted)',
              )}
            >
              {v === 'board' ? 'Board' : 'List'}
            </button>
          ))}
        </div>
      </div>

      {view === 'board' ? (
        <EnquiryBoard
          enquiries={enquiries ?? []}
          isLoading={isLoading}
          updateStatus={updateStatus}
          convertMutation={convertMutation}
        />
      ) : (
        <EnquiryListView
          enquiries={enquiries ?? []}
          isLoading={isLoading}
          updateStatus={updateStatus}
          convertMutation={convertMutation}
        />
      )}

      <NewEnquiryDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function FunnelStrip({ stats }: { stats: { total: number; new: number; contacted: number; interested: number; converted: number } }) {
  const segments: { label: string; value: number }[] = [
    { label: 'Total', value: stats.total },
    { label: 'New', value: stats.new },
    { label: 'Contacted', value: stats.contacted },
    { label: 'Interested', value: stats.interested },
    { label: 'Converted', value: stats.converted },
  ]
  return (
    <Card className="w-full sm:w-auto">
      <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        {segments.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <span className="hidden h-6 w-px bg-(--color-border) sm:block" aria-hidden />}
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-lg font-bold tabular-nums text-(--color-foreground)">{s.value}</span>
              <span className="text-xs text-(--color-muted-foreground)">{s.label}</span>
            </div>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  )
}

function EnquiryBoard({
  enquiries,
  isLoading,
  updateStatus,
  convertMutation,
}: {
  enquiries: Enquiry[]
  isLoading: boolean
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
}) {
  const grouped = React.useMemo(() => {
    const map: Record<EnquiryStatus, Enquiry[]> = { New: [], Contacted: [], Interested: [], Converted: [] }
    for (const e of enquiries) map[e.status].push(e)
    return map
  }, [enquiries])

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {STATUSES.map((status) => {
        const meta = STATUS_META[status]
        const list = grouped[status]
        return (
          <div
            key={status}
            className="flex min-w-[15rem] flex-1 flex-col overflow-hidden rounded-xl border border-(--color-border) bg-(--color-card)"
          >
            <div className={cn('h-1', meta.accent)} />
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="font-display text-sm font-semibold text-(--color-foreground)">{status}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums', meta.pill)}>
                {list.length}
              </span>
            </div>
            <div className="flex max-h-[32rem] flex-col gap-2 overflow-y-auto px-3 pb-3">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
              ) : list.length === 0 ? (
                <p className="py-6 text-center text-xs text-(--color-muted-foreground)">No leads here</p>
              ) : (
                list.map((e) => (
                  <LeadCard
                    key={e.id}
                    enquiry={e}
                    updateStatus={updateStatus}
                    convertMutation={convertMutation}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LeadCard({
  enquiry: e,
  updateStatus,
  convertMutation,
}: {
  enquiry: Enquiry
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
}) {
  const next = NEXT_STATUS[e.status]
  return (
    <div className="space-y-2 rounded-lg border border-(--color-border) bg-(--color-muted) p-3">
      <div>
        <p className="text-sm font-medium text-(--color-foreground)">{e.student_name}</p>
        <p className="text-xs text-(--color-muted-foreground)">{e.program}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-(--color-muted-foreground)">
        <Phone className="h-3 w-3 shrink-0" />
        <span className="tabular-nums">{e.mobile}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {e.year_of_study && <Badge variant="default">{e.year_of_study}</Badge>}
        {e.reference_source && <Badge variant="info">{e.reference_source}</Badge>}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] tabular-nums text-(--color-muted-foreground)">{formatDate(e.created_at)}</span>
        {e.status !== 'Converted' && (
          <div className="flex items-center gap-1">
            {next && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Move ${e.student_name} to ${next}`}
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: e.id, status: next })}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              loading={convertMutation.isPending}
              onClick={() => convertMutation.mutate(e.id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Convert
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function EnquiryListView({
  enquiries,
  isLoading,
  updateStatus,
  convertMutation,
}: {
  enquiries: Enquiry[]
  isLoading: boolean
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
}) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')

  const filtered = enquiries.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false
    if (search && !`${e.student_name} ${e.mobile} ${e.program}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Enquiries</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search name, mobile, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No enquiries found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.student_name}</TableCell>
                  <TableCell>{e.mobile}</TableCell>
                  <TableCell>{e.program}</TableCell>
                  <TableCell>{e.year_of_study ?? '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={e.status}
                      disabled={e.status === 'Converted'}
                      onChange={(ev) => updateStatus.mutate({ id: e.id, status: ev.target.value as EnquiryStatus })}
                      className="h-8 w-32 text-xs"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
                  </TableCell>
                  <TableCell>{formatDate(e.created_at)}</TableCell>
                  <TableCell>
                    {e.status !== 'Converted' && (
                      <Button
                        size="sm"
                        variant="outline"
                        loading={convertMutation.isPending}
                        onClick={() => convertMutation.mutate(e.id)}
                      >
                        Convert
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function NewEnquiryDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    student_name: '', mobile: '', program: '', year_of_study: '', reference_source: '', notes: '',
  })

  const createMutation = useMutation({
    mutationFn: () => api.post('/enquiries', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Enquiry created')
      setForm({ student_name: '', mobile: '', program: '', year_of_study: '', reference_source: '', notes: '' })
      onClose()
    },
    onError: () => toast.error('Could not create enquiry'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Enquiry" description="Capture a new student lead.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="student_name">Student Name *</Label>
          <Input id="student_name" required value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mobile">Mobile *</Label>
            <Input id="mobile" required type="tel" minLength={7} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="program">Program *</Label>
            <Input id="program" required value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="e.g. Robotics" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="year">Year of Study</Label>
            <Select id="year" value={form.year_of_study} onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}>
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="reference">Reference Source</Label>
            <Input id="reference" value={form.reference_source} onChange={(e) => setForm({ ...form, reference_source: e.target.value })} placeholder="e.g. Instagram" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Enquiry</Button>
        </div>
      </form>
    </Dialog>
  )
}
