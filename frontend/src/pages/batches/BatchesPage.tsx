import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, CalendarRange, ArrowRight } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { StatusBadge, Badge } from '@/components/ui/badge'
import { Meter } from '@/components/ui/progress'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import type { Batch, BatchMode, BatchStatus } from '@/lib/types'

const MODES: BatchMode[] = ['Online', 'Offline', 'Hybrid']
const STATUSES: BatchStatus[] = ['Upcoming', 'Active', 'Completed']

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
  const [formOpen, setFormOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [modeFilter, setModeFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const { data: batches, isLoading } = useBatches()
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

  const programOptions = React.useMemo(
    () => Array.from(new Set((batches ?? []).map((b) => b.program))),
    [batches],
  )

  const filtered = (batches ?? []).filter((b) => {
    if (programFilter && b.program !== programFilter) return false
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

      {/* Status summary chips */}
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

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          <Input
            placeholder="Search batch, program, trainer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="w-auto">
            <option value="">All programs</option>
            {programOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="w-auto">
            <option value="">All modes</option>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </CardContent>
      </Card>

      {/* Card grid */}
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
            <BatchCard key={b.id} batch={b} onStatusChange={(status) => updateStatus.mutate({ id: b.id, status })} />
          ))}
        </div>
      )}

      <NewBatchDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function BatchCard({ batch: b, onStatusChange }: { batch: Batch; onStatusChange: (status: BatchStatus) => void }) {
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
          <StatusBadge status={b.status} />
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

function NewBatchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    batch_name: '', program: '', trainer: '', start_date: '', end_date: '',
    seats_total: '', mode: 'Offline' as BatchMode, status: 'Upcoming' as BatchStatus,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/batches', {
        ...form,
        trainer: form.trainer || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        seats_total: Number(form.seats_total) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      toast.success('Batch created')
      setForm({ batch_name: '', program: '', trainer: '', start_date: '', end_date: '', seats_total: '', mode: 'Offline', status: 'Upcoming' })
      onClose()
    },
    onError: () => toast.error('Could not create batch'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Batch" description="Set up a new training batch.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="batch_name">Batch Name *</Label>
          <Input id="batch_name" required value={form.batch_name} onChange={(e) => setForm({ ...form, batch_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="program">Program *</Label>
            <Input id="program" required value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="e.g. Robotics" />
          </div>
          <div>
            <Label htmlFor="trainer">Trainer</Label>
            <Input id="trainer" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="seats_total">Total Seats</Label>
            <Input id="seats_total" type="number" min={0} value={form.seats_total} onChange={(e) => setForm({ ...form, seats_total: e.target.value })} />
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Batch</Button>
        </div>
      </form>
    </Dialog>
  )
}
