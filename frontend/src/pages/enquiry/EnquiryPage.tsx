import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, MessagesSquare, CheckCircle2, Phone, ArrowRightLeft } from 'lucide-react'
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
import type { Enquiry, EnquiryStatus } from '@/lib/types'

const STATUSES: EnquiryStatus[] = ['New', 'Contacted', 'Interested', 'Converted']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

function useEnquiries() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['enquiries', branchParam],
    queryFn: () => api.get<Enquiry[]>(`/enquiries${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function EnquiryPage() {
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: enquiries, isLoading } = useEnquiries()

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

  const byProgram = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enquiries ?? []) map.set(e.program, (map.get(e.program) ?? 0) + 1)
    return Array.from(map.entries())
  }, [enquiries])

  const byReference = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enquiries ?? []) {
      const key = e.reference_source || 'Unknown'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
  }, [enquiries])

  const byYear = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enquiries ?? []) {
      const key = e.year_of_study || 'Unspecified'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
  }, [enquiries])

  const recent = (enquiries ?? []).slice(0, 5)
  const maxYearCount = Math.max(1, ...byYear.map(([, c]) => c))

  async function handleExport() {
    try {
      await downloadExport('/enquiries/export', 'enquiries.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Enquiry Management</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Track leads from first contact to conversion.</p>
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
            <Plus className="h-4 w-4" /> New Enquiry
          </Button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <EnquiryDashboard
          isLoading={isLoading}
          stats={stats}
          byProgram={byProgram}
          byReference={byReference}
          byYear={byYear}
          maxYearCount={maxYearCount}
          recent={recent}
          onViewAll={() => setView('list')}
        />
      ) : (
        <EnquiryListView enquiries={enquiries ?? []} isLoading={isLoading} />
      )}

      <NewEnquiryDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function EnquiryDashboard({
  isLoading, stats, byProgram, byReference, byYear, maxYearCount, recent, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; new: number; contacted: number; interested: number; converted: number }
  byProgram: [string, number][]
  byReference: [string, number][]
  byYear: [string, number][]
  maxYearCount: number
  recent: Enquiry[]
  onViewAll: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Enquiries" value={stats.total} icon={MessagesSquare} accent="primary" />
            <StatCard label="New" value={stats.new} icon={Phone} accent="warning" />
            <StatCard label="Contacted" value={stats.contacted} icon={Phone} accent="primary" />
            <StatCard label="Interested" value={stats.interested} icon={CheckCircle2} accent="accent" />
            <StatCard label="Converted" value={stats.converted} icon={ArrowRightLeft} accent="accent" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Enquiries by Program</CardTitle></CardHeader>
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
          <CardHeader><CardTitle>Enquiries by Reference Source</CardTitle></CardHeader>
          <CardContent>
            {byReference.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
            ) : (
              <div className="space-y-2">
                {byReference.map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between text-sm">
                    <span className="text-(--color-foreground)">{source}</span>
                    <span className="font-medium tabular-nums text-(--color-muted-foreground)">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Enquiries by Year of Study</CardTitle></CardHeader>
        <CardContent>
          {byYear.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
          ) : (
            <div className="space-y-3">
              {byYear.map(([year, count]) => (
                <div key={year} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-(--color-muted-foreground)">{year}</span>
                  <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                    <div
                      className="h-2.5 rounded-full bg-(--color-primary) transition-all"
                      style={{ width: `${(count / maxYearCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-sm font-medium tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Enquiries</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No enquiries yet"
              description="New leads you capture will show up here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name}</TableCell>
                    <TableCell>{e.mobile}</TableCell>
                    <TableCell>{e.program}</TableCell>
                    <TableCell>{e.year_of_study ?? '—'}</TableCell>
                    <TableCell>{e.reference_source ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell>{formatDate(e.created_at)}</TableCell>
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

function EnquiryListView({ enquiries, isLoading }: { enquiries: Enquiry[]; isLoading: boolean }) {
  const [search, setSearch] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const queryClient = useQueryClient()

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) =>
      api.patch(`/enquiries/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Could not update status'),
  })

  const convertMutation = useMutation({
    mutationFn: (id: string) => api.post(`/enquiries/${id}/convert`, { total_fee: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Converted to enrollment')
    },
    onError: () => toast.error('Conversion failed'),
  })

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
