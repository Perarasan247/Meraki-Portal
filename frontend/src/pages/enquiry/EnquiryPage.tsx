import * as React from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, MessagesSquare, Phone, Mail, ArrowRight, Trash2, Pencil, X } from 'lucide-react'
import { api, downloadExport, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { useProgramOptions } from '@/hooks/usePrograms'
import { useDebounced } from '@/hooks/useDebounced'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableHead } from '@/components/ui/table'
import type { SortState } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { ViewEnquiryDialog } from './ViewEnquiryDialog'
import { BranchField } from '@/components/ui/branch-field'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import { cn, formatDate } from '@/lib/utils'
import { ENQUIRY_TYPES } from '@/lib/types'
import type { Enquiry, EnquiryStatus, Page, Campaign } from '@/lib/types'

const STATUSES: EnquiryStatus[] = ['New', 'Contacted', 'Interested', 'Converted']
const DEFAULT_PAGE_SIZE = 5

const REFERENCE_SOURCES = [
  'Friend / Family', 'Existing Student', 'College / Faculty', 'Social Media',
  'Google Search', 'Walk-in', 'Advertisement', 'Other',
]

const EMPTY_ENQUIRY = {
  student_name: '', mobile: '', email: '', college: '', enquiry_type: 'Internship', program: '',
  year_of_study: '', reference_source: '', campaign_id: '', status: 'New', notes: '',
  branch_id: '',
}
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

/** Move-forward target for each stage. Interested → Converted runs the convert
 *  flow (which also creates the enrollment), not a plain status change. */
const NEXT_STATUS: Record<EnquiryStatus, EnquiryStatus | null> = {
  New: 'Contacted',
  Contacted: 'Interested',
  Interested: 'Converted',
  Converted: null,
}

/** Per-stage accent tone — keeps the board visually distinct from table sections. */
const STATUS_META: Record<EnquiryStatus, { accent: string; pill: string }> = {
  New: { accent: 'bg-cyan-500', pill: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300' },
  Contacted: { accent: 'bg-amber-500', pill: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  Interested: { accent: 'bg-blue-500', pill: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' },
  Converted: { accent: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
}

type UpdateStatusMutation = UseMutationResult<unknown, Error, { id: string; status: EnquiryStatus }, unknown>
type ConvertMutation = UseMutationResult<unknown, Error, string, unknown>
type DeleteMutation = UseMutationResult<unknown, Error, string, unknown>

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
  const [editing, setEditing] = React.useState<Enquiry | null>(null)
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

  const deleteMutation: DeleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/enquiries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Enquiry deleted')
    },
    onError: () => toast.error('Could not delete enquiry'),
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
          deleteMutation={deleteMutation}
          onEdit={setEditing}
        />
      ) : (
        <EnquiryListView
          updateStatus={updateStatus}
          convertMutation={convertMutation}
          deleteMutation={deleteMutation}
          onEdit={setEditing}
        />
      )}

      <EnquiryDialog
        open={formOpen || !!editing}
        enquiry={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
      />
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
  deleteMutation,
  onEdit,
}: {
  enquiries: Enquiry[]
  isLoading: boolean
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
  deleteMutation: DeleteMutation
  onEdit: (e: Enquiry) => void
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
                    deleteMutation={deleteMutation}
                    onEdit={onEdit}
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
  deleteMutation,
  onEdit,
}: {
  enquiry: Enquiry
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
  deleteMutation: DeleteMutation
  onEdit: (e: Enquiry) => void
}) {
  const confirm = useConfirm()
  const next = NEXT_STATUS[e.status]
  const isConvertStep = e.status === 'Interested'

  async function onDelete() {
    if (await confirm({
      title: 'Delete enquiry?',
      description: <>“{e.student_name}” will be permanently removed. This cannot be undone.</>,
      confirmLabel: 'Delete',
      tone: 'danger',
    })) deleteMutation.mutate(e.id)
  }
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
      {e.email && (
        <div className="flex items-center gap-1.5 text-xs text-(--color-muted-foreground)">
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{e.email}</span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {e.year_of_study && <Badge variant="default">{e.year_of_study}</Badge>}
      </div>
      {/* Wraps instead of overflowing when a card is narrow. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 pt-1">
        <span className="whitespace-nowrap text-[11px] tabular-nums text-(--color-muted-foreground)">
          {formatDate(e.created_at)}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          {next && (
            <Button
              size="sm"
              variant="ghost"
              // From Interested the arrow converts (creates the enrollment);
              // earlier stages just advance the status.
              title={isConvertStep ? 'Convert to enrollment' : `Move to ${next}`}
              aria-label={isConvertStep ? `Convert ${e.student_name} to enrollment` : `Move ${e.student_name} to ${next}`}
              loading={isConvertStep && convertMutation.isPending}
              disabled={updateStatus.isPending}
              onClick={() =>
                isConvertStep
                  ? convertMutation.mutate(e.id)
                  : updateStatus.mutate({ id: e.id, status: next })
              }
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Edit ${e.student_name}`}
            onClick={() => onEdit(e)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Delete ${e.student_name}`}
            className="text-(--color-muted-foreground) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function EnquiryListView({
  updateStatus,
  convertMutation,
  deleteMutation,
  onEdit,
}: {
  updateStatus: UpdateStatusMutation
  convertMutation: ConvertMutation
  deleteMutation: DeleteMutation
  onEdit: (e: Enquiry) => void
}) {
  const confirm = useConfirm()
  const branchParam = useBranchQueryParam()
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [yearFilter, setYearFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [sort, setSort] = React.useState<SortState>({ by: 'created_at', dir: 'desc' })
  const [viewing, setViewing] = React.useState<Enquiry | null>(null)
  const debouncedSearch = useDebounced(search.trim(), 300)
  const programs = useProgramOptions()
  const hasFilters = !!(search || statusFilter || programFilter || yearFilter)
  // Any change to what's being listed sends you back to page 1.
  React.useEffect(() => setPage(1), [debouncedSearch, statusFilter, programFilter, yearFilter, pageSize, sort])

  // One builder for both the query and the prefetch, so they can't drift apart.
  const listKey = React.useCallback(
    (p: number) => ['enquiries', branchParam, 'list', p, pageSize, debouncedSearch, statusFilter, programFilter, yearFilter, sort.by, sort.dir],
    [branchParam, pageSize, debouncedSearch, statusFilter, programFilter, yearFilter, sort],
  )
  const fetchPage = React.useCallback(
    (p: number) => {
      const qs = new URLSearchParams(branchParam)
      qs.set('page', String(p))
      qs.set('page_size', String(pageSize))
      qs.set('sort_by', sort.by)
      qs.set('sort_dir', sort.dir)
      if (debouncedSearch) qs.set('search', debouncedSearch)
      if (statusFilter) qs.set('status_filter', statusFilter)
      if (programFilter) qs.set('program', programFilter)
      if (yearFilter) qs.set('year_of_study', yearFilter)
      return api.get<Page<Enquiry>>(`/enquiries?${qs.toString()}`)
    },
    [branchParam, pageSize, sort, debouncedSearch, statusFilter, programFilter, yearFilter],
  )

  const { data, isLoading } = useQuery({
    queryKey: listKey(page),
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  const queryClient = useQueryClient()
  React.useEffect(() => {
    if (page * pageSize >= total) return
    queryClient.prefetchQuery({ queryKey: listKey(page + 1), queryFn: () => fetchPage(page + 1) })
  }, [page, pageSize, total, queryClient, listKey, fetchPage])

  return (
    <>
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Enquiries</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search name, mobile, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
          <Select aria-label="Filter by program" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-auto">
            <option value="">All programs</option>
            {programs.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select aria-label="Filter by year of study" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="w-auto">
            <option value="">All years</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setProgramFilter(''); setYearFilter('') }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : items.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="No enquiries found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Name" column="student_name" sort={sort} onSort={setSort} />
                <SortableHead label="Mobile" column="mobile" sort={sort} onSort={setSort} />
                <SortableHead label="Program" column="program" sort={sort} onSort={setSort} />
                <SortableHead label="Year" column="year_of_study" sort={sort} onSort={setSort} />
                <SortableHead label="Status" column="status" sort={sort} onSort={setSort} />
                <SortableHead label="Date" column="created_at" sort={sort} onSort={setSort} />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((e) => (
                <TableRow
                  key={e.id}
                  onClick={() => setViewing(e)}
                  className="cursor-pointer"
                  title="View details"
                >
                  <TableCell className="font-medium">
                    {e.student_name}
                    {e.email && <span className="block text-xs font-normal text-(--color-muted-foreground)">{e.email}</span>}
                  </TableCell>
                  <TableCell>{e.mobile}</TableCell>
                  <TableCell>{e.program}</TableCell>
                  <TableCell>{e.year_of_study ?? '—'}</TableCell>
                  {/* The status dropdown is interactive — don't let it open the row view. */}
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
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
                  {/* Buttons must not also trigger the row's view-details click. */}
                  <TableCell onClick={(ev) => ev.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit"
                        aria-label={`Edit ${e.student_name}`}
                        onClick={() => onEdit(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {/* Already-converted rows keep an invisible placeholder so every
                          row's actions stay in the same columns. */}
                      {e.status !== 'Converted' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={convertMutation.isPending}
                          onClick={() => convertMutation.mutate(e.id)}
                        >
                          Convert
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="invisible"
                          aria-hidden
                          tabIndex={-1}
                          disabled
                        >
                          Convert
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${e.student_name}`}
                        onClick={async () => {
                          if (await confirm({
                            title: 'Delete enquiry?',
                            description: <>“{e.student_name}” will be permanently removed. This cannot be undone.</>,
                            confirmLabel: 'Delete',
                            tone: 'danger',
                          })) deleteMutation.mutate(e.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
    <Pagination
      page={page}
      pageSize={pageSize}
      total={total}
      onPage={setPage}
      onPageSizeChange={setPageSize}
    />
    <ViewEnquiryDialog
      enquiry={viewing}
      onClose={() => setViewing(null)}
      onEdit={(e) => { setViewing(null); onEdit(e) }}
    />
    </>
  )
}

/** Create a new enquiry, or edit an existing one when `enquiry` is passed. */
function EnquiryDialog({
  open, onClose, enquiry,
}: {
  open: boolean
  onClose: () => void
  enquiry?: Enquiry | null
}) {
  const queryClient = useQueryClient()
  const programs = useProgramOptions(open)
  const isEdit = !!enquiry
  // Campaigns are optional context — if the user has no marketing access this
  // simply stays empty and the field falls back to "None / Direct".
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns', 'all'],
    queryFn: () => api.get<Campaign[]>('/marketing/campaigns'),
    enabled: open,
    retry: false,
  })

  const [form, setForm] = React.useState(EMPTY_ENQUIRY)
  const set = (k: keyof typeof EMPTY_ENQUIRY, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Prefill when editing; reset to blanks when creating.
  React.useEffect(() => {
    if (!open) return
    setForm(
      enquiry
        ? {
            student_name: enquiry.student_name,
            mobile: enquiry.mobile,
            email: enquiry.email ?? '',
            college: enquiry.college ?? '',
            enquiry_type: enquiry.enquiry_type ?? 'Internship',
            program: enquiry.program,
            year_of_study: enquiry.year_of_study ?? '',
            reference_source: enquiry.reference_source ?? '',
            campaign_id: enquiry.campaign_id ?? '',
            status: enquiry.status,
            notes: enquiry.notes ?? '',
            branch_id: enquiry.branch_id ?? '',
          }
        : EMPTY_ENQUIRY,
    )
  }, [open, enquiry])

  const createMutation = useMutation({
    mutationFn: () => {
      const body = {
        student_name: form.student_name.trim(),
        mobile: form.mobile,
        email: form.email.trim() || null,
        college: form.college.trim() || null,
        enquiry_type: form.enquiry_type,
        program: form.program,
        year_of_study: form.year_of_study || null,
        reference_source: form.reference_source || null,
        campaign_id: form.campaign_id || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      return enquiry
        ? api.patch(`/enquiries/${enquiry.id}`, body)
        // Super admin only — branch users are scoped server-side.
        : api.post('/enquiries', { ...body, branch_id: form.branch_id || undefined })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success(isEdit ? 'Enquiry updated' : 'Enquiry created')
      setForm(EMPTY_ENQUIRY)
      onClose()
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : `Could not ${isEdit ? 'update' : 'create'} enquiry`),
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${enquiry.student_name}` : 'Add New Enquiry'}
      description={isEdit ? 'Update this enquiry.' : 'Capture a new student lead.'}
      className="max-w-3xl"
      footer={
        <>
          {!isEdit && (
            <Button type="button" variant="ghost" onClick={() => setForm(EMPTY_ENQUIRY)}>Clear</Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="enquiry-form" loading={createMutation.isPending}>
            {isEdit ? 'Save changes' : 'Add Enquiry'}
          </Button>
        </>
      }
    >
      <form
        id="enquiry-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="student_name">Student Name *</Label>
            <Input id="student_name" required value={form.student_name} onChange={(e) => set('student_name', e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile *</Label>
            <MobileInput id="mobile" required minLength={10} value={form.mobile} onValueChange={(v) => set('mobile', v)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="college">College / Institution</Label>
            <Input id="college" value={form.college} onChange={(e) => set('college', e.target.value)} placeholder="College name" />
          </div>
          <div>
            <Label htmlFor="enquiry_type">Looking For *</Label>
            <Select id="enquiry_type" required value={form.enquiry_type} onChange={(e) => set('enquiry_type', e.target.value)}>
              {ENQUIRY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="program">Program of Interest *</Label>
            <Select id="program" required value={form.program} onChange={(e) => set('program', e.target.value)}>
              <option value="">Select program</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="year">Year of Study</Label>
            <Select id="year" value={form.year_of_study} onChange={(e) => set('year_of_study', e.target.value)}>
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="reference_source">Reference By</Label>
            <Select id="reference_source" value={form.reference_source} onChange={(e) => set('reference_source', e.target.value)}>
              <option value="">Select source</option>
              {REFERENCE_SOURCES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="campaign_id">Campaign / Lead Source</Label>
            <Select id="campaign_id" value={form.campaign_id} onChange={(e) => set('campaign_id', e.target.value)}>
              <option value="">None / Direct</option>
              {(campaigns ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="status">Enquiry Status</Label>
            <Select id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.filter((s) => s !== 'Converted').map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          {/* Branch is only picked when creating; an enquiry doesn't move branches. */}
          {!isEdit && <BranchField value={form.branch_id} onChange={(v) => set('branch_id', v)} />}
        </div>

        <div>
          <Label htmlFor="notes">Remarks / Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes…" className="min-h-20" />
        </div>

      </form>
    </Dialog>
  )
}
