import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, CalendarRange, CheckCircle2, Clock, Flag } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn, formatDate } from '@/lib/utils'
import type { Batch, BatchMode, BatchStatus } from '@/lib/types'

const MODES: BatchMode[] = ['Online', 'Offline', 'Hybrid']
const STATUSES: BatchStatus[] = ['Upcoming', 'Active', 'Completed']

function useBatches() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['batches', branchParam],
    queryFn: () => api.get<Batch[]>(`/batches${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function BatchesPage() {
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: batches, isLoading } = useBatches()

  const stats = React.useMemo(() => {
    const list = batches ?? []
    return {
      total: list.length,
      active: list.filter((b) => b.status === 'Active').length,
      upcoming: list.filter((b) => b.status === 'Upcoming').length,
      completed: list.filter((b) => b.status === 'Completed').length,
    }
  }, [batches])

  const byProgram = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const b of batches ?? []) map.set(b.program, (map.get(b.program) ?? 0) + 1)
    return Array.from(map.entries())
  }, [batches])

  const byMode = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const b of batches ?? []) map.set(b.mode, (map.get(b.mode) ?? 0) + 1)
    return MODES.map((m) => [m, map.get(m) ?? 0] as [string, number])
  }, [batches])

  const recent = (batches ?? []).slice(0, 5)

  async function handleExport() {
    try {
      await downloadExport('/batches/export', 'batches.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Batch Management</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Plan and track training batches.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-(--color-border) p-1">
            {(['dashboard', 'list'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                  view === v ? 'bg-(--color-primary) text-(--color-primary-foreground)' : 'text-(--color-muted-foreground) hover:bg-(--color-muted)',
                )}
              >
                {v === 'dashboard' ? 'Dashboard' : 'List View'}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> New Batch
          </Button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <BatchesDashboard
          isLoading={isLoading}
          stats={stats}
          byProgram={byProgram}
          byMode={byMode}
          batches={batches ?? []}
          recent={recent}
          onViewAll={() => setView('list')}
        />
      ) : (
        <BatchesListView batches={batches ?? []} isLoading={isLoading} />
      )}

      <NewBatchDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function BatchesDashboard({
  isLoading, stats, byProgram, byMode, batches, recent, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; active: number; upcoming: number; completed: number }
  byProgram: [string, number][]
  byMode: [string, number][]
  batches: Batch[]
  recent: Batch[]
  onViewAll: () => void
}) {
  const maxModeCount = Math.max(1, ...byMode.map(([, c]) => c))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Batches" value={stats.total} icon={CalendarRange} accent="primary" />
            <StatCard label="Active" value={stats.active} icon={CheckCircle2} accent="accent" />
            <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} accent="warning" />
            <StatCard label="Completed" value={stats.completed} icon={Flag} accent="danger" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Batches by Program</CardTitle></CardHeader>
          <CardContent>
            {byProgram.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {byProgram.map(([program, count]) => (
                  <div key={program} className="rounded-lg border border-(--color-border) p-3">
                    <p className="text-xs text-(--color-muted-foreground)">{program}</p>
                    <p className="font-display text-lg font-bold">{count}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Batches by Mode</CardTitle></CardHeader>
          <CardContent>
            {byMode.every(([, c]) => c === 0) ? (
              <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byMode.map(([mode, count]) => (
                  <div key={mode} className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-sm text-(--color-muted-foreground)">{mode}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                      <div
                        className="h-2.5 rounded-full bg-(--color-primary) transition-all"
                        style={{ width: `${(count / maxModeCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm font-medium tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Seat Utilisation by Batch</CardTitle></CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
          ) : (
            <div className="space-y-3">
              {batches.slice(0, 8).map((b) => {
                const pct = b.seats_total > 0 ? Math.min(100, (b.seats_filled / b.seats_total) * 100) : 0
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-(--color-muted-foreground)">{b.batch_name}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                      <div className="h-2.5 rounded-full bg-(--color-accent) transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-16 text-right text-sm font-medium tabular-nums">{b.seats_filled}/{b.seats_total}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>All Batches (Quick View)</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState icon={CalendarRange} title="No batches yet" description="Batches you create will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.batch_name}</TableCell>
                    <TableCell>{b.program}</TableCell>
                    <TableCell>{b.trainer ?? '—'}</TableCell>
                    <TableCell>{b.start_date ? formatDate(b.start_date) : '—'}</TableCell>
                    <TableCell>{b.end_date ? formatDate(b.end_date) : '—'}</TableCell>
                    <TableCell>{b.seats_filled}/{b.seats_total}</TableCell>
                    <TableCell>{b.mode}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function BatchesListView({ batches, isLoading }: { batches: Batch[]; isLoading: boolean }) {
  const [search, setSearch] = React.useState('')
  const [programFilter, setProgramFilter] = React.useState('')
  const [modeFilter, setModeFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BatchStatus }) => api.patch(`/batches/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  const programOptions = React.useMemo(() => Array.from(new Set(batches.map((b) => b.program))), [batches])

  const filtered = batches.filter((b) => {
    if (programFilter && b.program !== programFilter) return false
    if (modeFilter && b.mode !== modeFilter) return false
    if (statusFilter && b.status !== statusFilter) return false
    if (search && !`${b.batch_name} ${b.program} ${b.trainer ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Batches</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search batch, program, trainer…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
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
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No batches found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Trainer</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Seats</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.batch_name}</TableCell>
                  <TableCell>{b.program}</TableCell>
                  <TableCell>{b.trainer ?? '—'}</TableCell>
                  <TableCell>{b.start_date ? formatDate(b.start_date) : '—'}</TableCell>
                  <TableCell>{b.end_date ? formatDate(b.end_date) : '—'}</TableCell>
                  <TableCell>{b.seats_filled}/{b.seats_total}</TableCell>
                  <TableCell>{b.mode}</TableCell>
                  <TableCell>
                    <Select
                      value={b.status}
                      onChange={(ev) => updateStatus.mutate({ id: b.id, status: ev.target.value as BatchStatus })}
                      className="h-8 w-32 text-xs"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </Select>
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
