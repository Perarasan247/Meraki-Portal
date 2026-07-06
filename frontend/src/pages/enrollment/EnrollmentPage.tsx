import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, GraduationCap, Wallet, CircleDollarSign, CheckCircle2, AlertCircle } from 'lucide-react'
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
import { cn, formatCurrency } from '@/lib/utils'
import type { Enrollment, FeeStatus, Batch } from '@/lib/types'

const FEE_STATUSES: FeeStatus[] = ['Paid', 'Partial', 'Pending']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

function useEnrollments() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['enrollments', branchParam],
    queryFn: () => api.get<Enrollment[]>(`/enrollments${branchParam ? `?${branchParam}` : ''}`),
  })
}

function useBatchesForSelect() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['batches', branchParam],
    queryFn: () => api.get<Batch[]>(`/batches${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function EnrollmentPage() {
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: enrollments, isLoading } = useEnrollments()
  const { data: batches } = useBatchesForSelect()

  const batchNameById = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const b of batches ?? []) map.set(b.id, b.batch_name)
    return map
  }, [batches])

  const stats = React.useMemo(() => {
    const list = enrollments ?? []
    return {
      total: list.length,
      pending: list.filter((e) => e.fee_status === 'Pending').length,
      partial: list.filter((e) => e.fee_status === 'Partial').length,
      paid: list.filter((e) => e.fee_status === 'Paid').length,
      revenue: list.reduce((sum, e) => sum + e.paid_amount, 0),
    }
  }, [enrollments])

  const byProgram = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enrollments ?? []) map.set(e.program, (map.get(e.program) ?? 0) + 1)
    return Array.from(map.entries())
  }, [enrollments])

  const byFeeStatus = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enrollments ?? []) map.set(e.fee_status, (map.get(e.fee_status) ?? 0) + 1)
    return FEE_STATUSES.map((s) => [s, map.get(s) ?? 0] as [string, number])
  }, [enrollments])

  const byYear = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of enrollments ?? []) {
      const key = e.year_of_study || 'Unspecified'
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
  }, [enrollments])

  const pendingOrPartial = (enrollments ?? []).filter((e) => e.fee_status !== 'Paid').slice(0, 5)
  const maxFeeCount = Math.max(1, ...byFeeStatus.map(([, c]) => c))
  const maxYearCount = Math.max(1, ...byYear.map(([, c]) => c))

  async function handleExport() {
    try {
      await downloadExport('/enrollments/export', 'enrollments.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Enrollment Management</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Track enrolled students and fee collection.</p>
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
            <Plus className="h-4 w-4" /> New Enrollment
          </Button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <EnrollmentDashboard
          isLoading={isLoading}
          stats={stats}
          byProgram={byProgram}
          byFeeStatus={byFeeStatus}
          maxFeeCount={maxFeeCount}
          byYear={byYear}
          maxYearCount={maxYearCount}
          pendingOrPartial={pendingOrPartial}
          batchNameById={batchNameById}
          onViewAll={() => setView('list')}
        />
      ) : (
        <EnrollmentListView enrollments={enrollments ?? []} isLoading={isLoading} batchNameById={batchNameById} />
      )}

      <NewEnrollmentDialog open={formOpen} onClose={() => setFormOpen(false)} batches={batches ?? []} />
    </div>
  )
}

function EnrollmentDashboard({
  isLoading, stats, byProgram, byFeeStatus, maxFeeCount, byYear, maxYearCount, pendingOrPartial, batchNameById, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; pending: number; partial: number; paid: number; revenue: number }
  byProgram: [string, number][]
  byFeeStatus: [string, number][]
  maxFeeCount: number
  byYear: [string, number][]
  maxYearCount: number
  pendingOrPartial: Enrollment[]
  batchNameById: Map<string, string>
  onViewAll: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Enrolled" value={stats.total} icon={GraduationCap} accent="primary" />
            <StatCard label="Fee Pending" value={stats.pending} icon={AlertCircle} accent="danger" />
            <StatCard label="Partial Payment" value={stats.partial} icon={CircleDollarSign} accent="warning" />
            <StatCard label="Fully Paid" value={stats.paid} icon={CheckCircle2} accent="accent" />
            <StatCard label="Total Revenue" value={formatCurrency(stats.revenue)} icon={Wallet} accent="accent" />
          </>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Enrollments by Program</CardTitle></CardHeader>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Fee Collection Status</CardTitle></CardHeader>
          <CardContent>
            {byFeeStatus.every(([, c]) => c === 0) ? (
              <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byFeeStatus.map(([status, count]) => (
                  <div key={status} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-(--color-muted-foreground)">{status}</span>
                    <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                      <div
                        className="h-2.5 rounded-full bg-(--color-primary) transition-all"
                        style={{ width: `${(count / maxFeeCount) * 100}%` }}
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
          <CardHeader><CardTitle>Enrollments by Year of Study</CardTitle></CardHeader>
          <CardContent>
            {byYear.length === 0 ? (
              <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
            ) : (
              <div className="space-y-3">
                {byYear.map(([year, count]) => (
                  <div key={year} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm text-(--color-muted-foreground)">{year}</span>
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
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Students with Pending/Partial Fees</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : pendingOrPartial.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No pending fees" description="All enrolled students are fully paid up." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Total Fee</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrPartial.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name}</TableCell>
                    <TableCell>{e.program}</TableCell>
                    <TableCell>{e.batch_id ? batchNameById.get(e.batch_id) ?? '—' : '—'}</TableCell>
                    <TableCell>{formatCurrency(e.total_fee)}</TableCell>
                    <TableCell>{formatCurrency(e.paid_amount)}</TableCell>
                    <TableCell>{formatCurrency(e.pending_amount)}</TableCell>
                    <TableCell><StatusBadge status={e.fee_status} /></TableCell>
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

function EnrollmentListView({
  enrollments, isLoading, batchNameById,
}: {
  enrollments: Enrollment[]
  isLoading: boolean
  batchNameById: Map<string, string>
}) {
  const [search, setSearch] = React.useState('')
  const [feeStatusFilter, setFeeStatusFilter] = React.useState('')
  const [paymentTarget, setPaymentTarget] = React.useState<Enrollment | null>(null)
  const queryClient = useQueryClient()

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => api.post(`/enrollments/${id}/payment`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Payment recorded')
      setPaymentTarget(null)
    },
    onError: () => toast.error('Could not record payment'),
  })

  const filtered = enrollments.filter((e) => {
    if (feeStatusFilter && e.fee_status !== feeStatusFilter) return false
    if (search && !`${e.student_name} ${e.mobile} ${e.program}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>All Enrollments</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search name, mobile, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
            <Select value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)} className="w-auto">
              <option value="">All fee statuses</option>
              {FEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrollments found" description="Try adjusting your search or filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Total Fee</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name}</TableCell>
                    <TableCell>{e.mobile}</TableCell>
                    <TableCell>{e.program}</TableCell>
                    <TableCell>{e.batch_id ? batchNameById.get(e.batch_id) ?? '—' : '—'}</TableCell>
                    <TableCell>{formatCurrency(e.total_fee)}</TableCell>
                    <TableCell>{formatCurrency(e.paid_amount)}</TableCell>
                    <TableCell>{formatCurrency(e.pending_amount)}</TableCell>
                    <TableCell><StatusBadge status={e.fee_status} /></TableCell>
                    <TableCell>
                      {e.fee_status !== 'Paid' && (
                        <Button size="sm" variant="outline" onClick={() => setPaymentTarget(e)}>
                          Record Payment
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

      <RecordPaymentDialog
        enrollment={paymentTarget}
        onClose={() => setPaymentTarget(null)}
        loading={paymentMutation.isPending}
        onSubmit={(amount) => paymentTarget && paymentMutation.mutate({ id: paymentTarget.id, amount })}
      />
    </>
  )
}

function RecordPaymentDialog({
  enrollment, onClose, onSubmit, loading,
}: {
  enrollment: Enrollment | null
  onClose: () => void
  onSubmit: (amount: number) => void
  loading: boolean
}) {
  const [amount, setAmount] = React.useState('')

  React.useEffect(() => {
    if (enrollment) setAmount('')
  }, [enrollment])

  if (!enrollment) return null

  return (
    <Dialog open={!!enrollment} onClose={onClose} title="Record Payment" description={`${enrollment.student_name} — pending ${formatCurrency(enrollment.pending_amount)}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const value = Number(amount)
          if (value > 0) onSubmit(value)
        }}
      >
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input id="amount" required type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Record Payment</Button>
        </div>
      </form>
    </Dialog>
  )
}

function NewEnrollmentDialog({ open, onClose, batches }: { open: boolean; onClose: () => void; batches: Batch[] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    student_name: '', mobile: '', program: '', year_of_study: '', batch_id: '', total_fee: '', paid_amount: '',
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/enrollments', {
        ...form,
        batch_id: form.batch_id || null,
        total_fee: Number(form.total_fee) || 0,
        paid_amount: Number(form.paid_amount) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Enrollment created')
      setForm({ student_name: '', mobile: '', program: '', year_of_study: '', batch_id: '', total_fee: '', paid_amount: '' })
      onClose()
    },
    onError: () => toast.error('Could not create enrollment'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Enrollment" description="Enroll a new student.">
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
            <Label htmlFor="batch">Batch</Label>
            <Select id="batch" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
              <option value="">Unassigned</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="total_fee">Total Fee</Label>
            <Input id="total_fee" type="number" min={0} step="0.01" value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="paid_amount">Paid Amount</Label>
            <Input id="paid_amount" type="number" min={0} step="0.01" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Enrollment</Button>
        </div>
      </form>
    </Dialog>
  )
}
