import * as React from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, CalendarRange, ArrowRight, Pencil, Trash2, AlertTriangle, X } from 'lucide-react'
import { api, downloadExport, ApiError } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { useProgramOptions } from '@/hooks/usePrograms'
import { useDebounced } from '@/hooks/useDebounced'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/progress'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import { BranchField } from '@/components/ui/branch-field'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  SortableHead, type SortState,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { ViewBatchDialog } from './ViewBatchDialog'
import { cn, formatDate } from '@/lib/utils'
import type { Batch, BatchMode, BatchScope, BatchStatus, Page } from '@/lib/types'

const MODES: BatchMode[] = ['Online', 'Offline', 'Hybrid']
const STATUSES: BatchStatus[] = ['Upcoming', 'Active', 'Completed']
const SCOPES: BatchScope[] = ['Training', 'Internship', 'Project']
const DEFAULT_PAGE_SIZE = 5

const STATUS_DOT: Record<BatchStatus, string> = {
  Upcoming: 'bg-cyan-500',
  Active: 'bg-emerald-500',
  Completed: 'bg-(--color-muted-foreground)',
}

function seatTone(filled: number, total: number): 'primary' | 'warning' | 'danger' {
  const pct = total > 0 ? (filled / total) * 100 : 0
  if (pct >= 90) return 'danger'
  if (pct >= 70) return 'warning'
  return 'primary'
}

function useBatches() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['batches', branchParam],
    queryFn: () => api.get<Batch[]>(`/batches${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function BatchesPage() {
  const [view, setView] = React.useState<'cards' | 'list'>('cards')
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Batch | null>(null)
  const [search, setSearch] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [scopeFilter, setScopeFilter] = React.useState('')
  const [modeFilter, setModeFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const { data: batches, isLoading } = useBatches()
  const programOptions = useProgramOptions()
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BatchStatus }) => api.patch(`/batches/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  const stats = React.useMemo(() => {
    const list = batches ?? []
    return {
      upcoming: list.filter((b) => b.status === 'Upcoming').length,
      active: list.filter((b) => b.status === 'Active').length,
      completed: list.filter((b) => b.status === 'Completed').length,
    }
  }, [batches])


  const filtered = (batches ?? []).filter((b) => {
    if (programFilter && b.program !== programFilter) return false
    if (scopeFilter && b.scope !== scopeFilter) return false
    if (modeFilter && b.mode !== modeFilter) return false
    if (statusFilter && b.status !== statusFilter) return false
    if (search && !`${b.batch_name} ${b.program} ${b.trainer ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function handleExport() {
    try {
      await downloadExport('/batches/export', 'batches.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Management"
        subtitle="Schedules, trainers & seat capacity"
        icon={CalendarRange}
        actions={
          <>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New Batch
            </Button>
          </>
        }
      />

      {/* Status summary chips + view toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {STATUSES.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm"
            >
              <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />
              <span className="text-(--color-muted-foreground)">{s}</span>
              <span className="font-display font-semibold tabular-nums text-(--color-foreground)">
                {s === 'Upcoming' ? stats.upcoming : s === 'Active' ? stats.active : stats.completed}
              </span>
            </span>
          ))}
        </div>
        <div className="flex rounded-lg border border-(--color-border) p-1">
          {(['cards', 'list'] as const).map((v) => (
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
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'cards' ? (
        <>
          {/* Filters (cards view filters the loaded set client-side) */}
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 py-4">
              <Input
                placeholder="Search batch, program, trainer…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-56 flex-1"
              />
              <Select aria-label="Filter by program" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-auto max-w-44">
                <option value="">All programs</option>
                {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </Select>
              <Select aria-label="Filter by scope" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="w-auto max-w-44">
                <option value="">All scopes</option>
                {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Select aria-label="Filter by mode" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-auto max-w-44">
                <option value="">All modes</option>
                {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
              <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto max-w-44">
                <option value="">All status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </CardContent>
          </Card>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-4 h-2.5 w-full" />
                  <Skeleton className="mt-4 h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No batches found"
              description="Try adjusting your search or filters, or create a new batch."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((b) => (
                <BatchCard
                  key={b.id}
                  batch={b}
                  onStatusChange={(status) => updateStatus.mutate({ id: b.id, status })}
                  onEdit={() => setEditing(b)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <BatchListView onEdit={setEditing} />
      )}

      <BatchDialog
        open={formOpen || !!editing}
        batch={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
      />
    </div>
  )
}

/**
 * Table view: search, sort and paginate on the server, so it stays correct as
 * the batch count grows rather than filtering whatever happened to load.
 */
function BatchListView({ onEdit }: { onEdit: (b: Batch) => void }) {
  const confirm = useConfirm()
  const branchParam = useBranchQueryParam()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [scopeFilter, setScopeFilter] = React.useState('')
  const [modeFilter, setModeFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [sort, setSort] = React.useState<SortState>({ by: 'created_at', dir: 'desc' })
  const [viewing, setViewing] = React.useState<Batch | null>(null)
  const debouncedSearch = useDebounced(search.trim(), 300)
  const programs = useProgramOptions()
  const hasFilters = !!(search || programFilter || scopeFilter || modeFilter || statusFilter)
  // Any change to what's being listed sends you back to page 1.
  React.useEffect(
    () => setPage(1),
    [debouncedSearch, programFilter, scopeFilter, modeFilter, statusFilter, pageSize, sort],
  )

  // One builder for both the query and the prefetch, so they can't drift apart.
  const listKey = React.useCallback(
    (p: number) => ['batches', branchParam, 'list', p, pageSize, debouncedSearch, programFilter, scopeFilter, modeFilter, statusFilter, sort.by, sort.dir],
    [branchParam, pageSize, debouncedSearch, programFilter, scopeFilter, modeFilter, statusFilter, sort],
  )
  const fetchPage = React.useCallback(
    (p: number) => {
      const qs = new URLSearchParams(branchParam)
      qs.set('page', String(p))
      qs.set('page_size', String(pageSize))
      qs.set('sort_by', sort.by)
      qs.set('sort_dir', sort.dir)
      if (debouncedSearch) qs.set('search', debouncedSearch)
      if (programFilter) qs.set('program', programFilter)
      if (scopeFilter) qs.set('scope_filter', scopeFilter)
      if (modeFilter) qs.set('mode', modeFilter)
      if (statusFilter) qs.set('status_filter', statusFilter)
      return api.get<Page<Batch>>(`/batches?${qs.toString()}`)
    },
    [branchParam, pageSize, sort, debouncedSearch, programFilter, scopeFilter, modeFilter, statusFilter],
  )

  const { data, isLoading } = useQuery({
    queryKey: listKey(page),
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  React.useEffect(() => {
    if (page * pageSize >= total) return
    queryClient.prefetchQuery({ queryKey: listKey(page + 1), queryFn: () => fetchPage(page + 1) })
  }, [page, pageSize, total, queryClient, listKey, fetchPage])

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      api.delete(`/batches/${id}${force ? '?force=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Batch deleted')
    },
    onError: () => toast.error('Could not delete batch'),
  })

  async function handleDelete(b: Batch) {
    const ok = await confirm({
      title: `Delete “${b.batch_name}”?`,
      description: 'This removes the batch. Students enrolled in it are kept and simply unassigned.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await deleteMutation.mutateAsync({ id: b.id, force: false })
    } catch (err) {
      // 409 = students and/or progress tracking still point at this batch.
      if (err instanceof ApiError && err.status === 409) {
        const force = await confirm({
          title: 'This batch is in use',
          description: (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{err.message} Delete it anyway?</span>
            </div>
          ),
          confirmLabel: 'Delete anyway',
          tone: 'danger',
        })
        if (force) deleteMutation.mutate({ id: b.id, force: true })
      }
    }
  }

  return (
    <>
      <Card>
        {/* Title and toolbar stack, so both sit flush with the table's left edge. */}
        <CardHeader className="gap-3">
          <CardTitle>All Batches</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search batch, program, trainer…" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
            <Select aria-label="Filter by program" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All programs</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select aria-label="Filter by scope" value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All scopes</option>
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select aria-label="Filter by mode" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All modes</option>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
            <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All status</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(''); setProgramFilter(''); setScopeFilter(''); setModeFilter(''); setStatusFilter('') }}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : items.length === 0 ? (
            <EmptyState icon={CalendarRange} title="No batches found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="Batch" column="batch_name" sort={sort} onSort={setSort} />
                    <TableHead>Program</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Trainer</TableHead>
                    <SortableHead label="Starts" column="start_date" sort={sort} onSort={setSort} />
                    <TableHead>Seats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((b) => (
                    <TableRow
                      key={b.id}
                      onClick={() => setViewing(b)}
                      className="cursor-pointer"
                    >
                      <TableCell>
                        <span className="block max-w-[10rem] truncate font-medium text-(--color-foreground)" title={b.batch_name}>
                          {b.batch_name}
                        </span>
                        <span className="text-xs text-(--color-muted-foreground)">{b.mode}</span>
                      </TableCell>
                      <TableCell>
                        <span className="block max-w-[10rem] truncate" title={b.program}>{b.program}</span>
                      </TableCell>
                      <TableCell><Badge variant="default">{b.scope}</Badge></TableCell>
                      <TableCell>
                        <span className="block max-w-[8rem] truncate" title={b.trainer ?? 'Unassigned'}>
                          {b.trainer ?? <span className="text-(--color-muted-foreground)">Unassigned</span>}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums">{b.start_date ? formatDate(b.start_date) : '—'}</TableCell>
                      <TableCell>
                        <div className="min-w-24">
                          <span className="text-sm tabular-nums">{b.seats_filled} / {b.seats_total}</span>
                          <Meter
                            value={b.seats_filled}
                            max={b.seats_total || b.seats_filled || 1}
                            tone={seatTone(b.seats_filled, b.seats_total)}
                            size="sm"
                            className="mt-1.5"
                          />
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={b.status} /></TableCell>
                      {/* Actions must not trigger the row's View. */}
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" title="Edit" aria-label={`Edit ${b.batch_name}`} onClick={() => onEdit(b)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete"
                            aria-label={`Delete ${b.batch_name}`}
                            className="text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
                            onClick={() => handleDelete(b)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSizeChange={setPageSize} />
        </CardContent>
      </Card>

      <ViewBatchDialog
        batch={viewing}
        onClose={() => setViewing(null)}
        onEdit={(b) => { setViewing(null); onEdit(b) }}
      />
    </>
  )
}

function BatchCard({ batch: b, onStatusChange, onEdit }: { batch: Batch; onStatusChange: (status: BatchStatus) => void; onEdit: () => void }) {
  const tone = seatTone(b.seats_filled, b.seats_total)
  const seatLabel = tone === 'danger' ? 'text-rose-500' : tone === 'warning' ? 'text-amber-500' : 'text-(--color-muted-foreground)'
  const trainerInitial = (b.trainer ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-card) shadow-(--shadow-card) transition-shadow duration-200 hover:shadow-(--shadow-card-hover)">
      <span className={cn('absolute inset-y-0 left-0 w-1', STATUS_DOT[b.status])} aria-hidden />
      <div className="space-y-4 p-5 pl-6">
        {/* Title + status */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-base font-semibold leading-tight text-(--color-foreground)">{b.batch_name}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            <StatusBadge status={b.status} />
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Edit ${b.batch_name}`}
              className="cursor-pointer rounded-md p-1 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-foreground)"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Program + mode */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-(--color-muted-foreground)">{b.program}</span>
          <Badge variant="default">{b.mode}</Badge>
        </div>

        {/* Schedule line */}
        <div className="flex items-center gap-2 text-sm text-(--color-foreground)">
          <CalendarRange className="h-4 w-4 shrink-0 text-(--color-muted-foreground)" />
          <span className="tabular-nums">{b.start_date ? formatDate(b.start_date) : '—'}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-(--color-muted-foreground)" />
          <span className="tabular-nums">{b.end_date ? formatDate(b.end_date) : '—'}</span>
        </div>

        {/* Trainer */}
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) text-xs font-semibold text-(--color-primary)">
            {trainerInitial}
          </span>
          <span className="text-sm text-(--color-foreground)">{b.trainer ?? 'Unassigned'}</span>
        </div>

        {/* Seat capacity */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-(--color-muted-foreground)">Seat capacity</span>
            <span className={cn('font-medium tabular-nums', seatLabel)}>
              {b.seats_filled} / {b.seats_total} seats
            </span>
          </div>
          <Meter value={b.seats_filled} max={b.seats_total} tone={tone} size="sm" />
        </div>

        {/* Per-batch action: status change */}
        <div className="flex items-center justify-between border-t border-(--color-border) pt-3">
          <Label htmlFor={`status-${b.id}`} className="text-xs text-(--color-muted-foreground)">
            Update status
          </Label>
          <Select
            id={`status-${b.id}`}
            value={b.status}
            onChange={(ev) => onStatusChange(ev.target.value as BatchStatus)}
            className="h-8 w-32 text-xs"
            aria-label={`Update status for ${b.batch_name}`}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
    </div>
  )
}

/** A blank New Batch form. */
const blankBatch = () => ({
  batch_name: '', program: '', scope: 'Internship' as BatchScope, trainer: '', venue: '',
  start_date: '', end_date: '', seats_total: '', mode: 'Offline' as BatchMode,
  status: 'Upcoming' as BatchStatus, branch_id: '',
})

function BatchDialog({ open, onClose, batch }: { open: boolean; onClose: () => void; batch?: Batch | null }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const programs = useProgramOptions(open)
  const [form, setForm] = React.useState(blankBatch)

  // Prefill when editing; reset to blanks when creating.
  React.useEffect(() => {
    if (!open) return
    setForm({
      batch_name: batch?.batch_name ?? '',
      program: batch?.program ?? '',
      scope: batch?.scope ?? 'Internship',
      trainer: batch?.trainer ?? '',
      venue: batch?.venue ?? '',
      start_date: batch?.start_date ?? '',
      end_date: batch?.end_date ?? '',
      seats_total: batch?.seats_total != null ? String(batch.seats_total) : '',
      mode: batch?.mode ?? 'Offline',
      status: batch?.status ?? 'Upcoming',
      branch_id: batch?.branch_id ?? '',
    })
  }, [open, batch])

  const deleteMutation = useMutation({
    mutationFn: (force: boolean) => api.delete(`/batches/${batch!.id}${force ? '?force=true' : ''}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Batch deleted')
      onClose()
    },
    onError: async (err) => {
      // 409 = students and/or progress tracking still point at this batch.
      if (err instanceof ApiError && err.status === 409) {
        const ok = await confirm({
          title: 'This batch is in use',
          description: (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{err.message} Delete it anyway?</span>
            </div>
          ),
          confirmLabel: 'Delete anyway',
          tone: 'danger',
        })
        if (ok) deleteMutation.mutate(true)
        return
      }
      toast.error(err instanceof ApiError ? err.message : 'Could not delete batch')
    },
  })

  const saveMutation = useMutation({
    mutationFn: (force: boolean) => {
      const body = {
        ...form,
        trainer: form.trainer.trim() || null,
        venue: form.venue.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        seats_total: Number(form.seats_total) || 0,
        branch_id: form.branch_id || undefined,
      }
      return batch
        ? api.patch(`/batches/${batch.id}${force ? '?force=true' : ''}`, body)
        : api.post('/batches', body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      // A branch move re-brands the enrolled students too.
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success(batch ? 'Batch updated' : 'Batch created')
      onClose()
    },
    onError: async (err) => {
      // 409 = moving this batch to another branch takes its students with it.
      if (err instanceof ApiError && err.status === 409) {
        const ok = await confirm({
          title: 'Move this batch to another branch?',
          description: (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{err.message} Move it anyway?</span>
            </div>
          ),
          confirmLabel: 'Move anyway',
        })
        if (ok) saveMutation.mutate(true)
        return
      }
      toast.error(
        err instanceof ApiError ? err.message : batch ? 'Could not update batch' : 'Could not create batch',
      )
    },
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={batch ? 'Edit Batch' : 'New Batch'}
      description={batch ? 'Update the batch details.' : 'Set up a new training batch.'}
      className="max-w-3xl"
      footer={
        <>
          {batch ? (
            /* Destructive action kept away from Save. */
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
              loading={deleteMutation.isPending}
              onClick={async () => {
                if (await confirm({
                  title: `Delete “${batch.batch_name}”?`,
                  description: 'This removes the batch. Students enrolled in it are kept and simply unassigned.',
                  confirmLabel: 'Delete',
                  tone: 'danger',
                })) deleteMutation.mutate(false)
              }}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={() => setForm(blankBatch())}>Clear</Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="batch-form" loading={saveMutation.isPending}>
            {batch ? 'Save changes' : 'Create Batch'}
          </Button>
        </>
      }
    >
      <form
        id="batch-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate(false)
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="batch_name">Batch Name / ID *</Label>
            <Input id="batch_name" required value={form.batch_name} onChange={(e) => setForm({ ...form, batch_name: e.target.value })} placeholder="e.g. AIML-JUN-2026" />
          </div>
          <div>
            <Label htmlFor="program">Program *</Label>
            <Select id="program" required value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
              <option value="">Select program</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="scope">Scope</Label>
            <Select id="scope" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value as BatchScope })}>
              {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="trainer">Trainer</Label>
            <Input id="trainer" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} placeholder="Trainer name" />
          </div>
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input id="end_date" type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="seats_total">Max Seats</Label>
            <Input id="seats_total" type="number" min={0} value={form.seats_total} onChange={(e) => setForm({ ...form, seats_total: e.target.value })} placeholder="30" />
          </div>
          <div>
            <Label htmlFor="mode">Mode</Label>
            <Select id="mode" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as BatchMode })}>
              {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BatchStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="venue">Venue / Platform</Label>
            <Input
              id="venue"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder={form.mode === 'Online' ? 'Zoom / Meet link' : 'Location or online link'}
            />
          </div>
          {/* BranchField renders nothing for branch users — they have no other
              branch to pick. On edit this is a move, so it warns first. */}
          <BranchField
            value={form.branch_id}
            onChange={(v) => setForm({ ...form, branch_id: v })}
            hint={
              batch && form.branch_id !== batch.branch_id
                ? 'Enrolled students and progress tracking move with the batch.'
                : undefined
            }
          />
        </div>
      </form>
    </Dialog>
  )
}
