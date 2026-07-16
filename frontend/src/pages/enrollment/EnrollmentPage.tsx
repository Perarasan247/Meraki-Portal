import * as React from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, GraduationCap, Wallet, CircleDollarSign, TrendingDown, Pencil, Trash2 } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { useProgramOptions } from '@/hooks/usePrograms'
import { useDebounced } from '@/hooks/useDebounced'
import { Pagination } from '@/components/ui/pagination'
import { BranchField } from '@/components/ui/branch-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageHeader } from '@/components/ui/page-header'
import { Meter } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import { cn, formatCurrency } from '@/lib/utils'
import type { Enrollment, FeeStatus, Batch, Page } from '@/lib/types'

const PAGE_SIZE = 25

const FEE_STATUSES: FeeStatus[] = ['Paid', 'Partial', 'Pending']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

type MeterTone = 'accent' | 'warning' | 'danger'

const FEE_TONE: Record<FeeStatus, MeterTone> = {
  Paid: 'accent',
  Partial: 'warning',
  Pending: 'danger',
}

function feeTone(status: FeeStatus): MeterTone {
  return FEE_TONE[status] ?? 'danger'
}

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
  const [editing, setEditing] = React.useState<Enrollment | null>(null)
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
      totalFee: list.reduce((sum, e) => sum + e.total_fee, 0),
      outstanding: list.reduce((sum, e) => sum + e.pending_amount, 0),
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
  const collectionPct = stats.totalFee > 0 ? Math.round((stats.revenue / stats.totalFee) * 100) : 0

  async function handleExport() {
    try {
      await downloadExport('/enrollments/export', 'enrollments.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enrollments"
        subtitle="Student records & fee collection"
        icon={GraduationCap}
        actions={
          <>
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
          </>
        }
      />

      <MoneySummary isLoading={isLoading} stats={stats} collectionPct={collectionPct} />

      {view === 'dashboard' ? (
        <EnrollmentDashboard
          isLoading={isLoading}
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
        <EnrollmentListView batchNameById={batchNameById} onEdit={setEditing} />
      )}

      <EnrollmentDialog
        open={formOpen || !!editing}
        enrollment={editing}
        onClose={() => { setFormOpen(false); setEditing(null) }}
        batches={batches ?? []}
      />
    </div>
  )
}

function MoneySummary({
  isLoading, stats, collectionPct,
}: {
  isLoading: boolean
  stats: { total: number; revenue: number; totalFee: number; outstanding: number }
  collectionPct: number
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="grid grid-cols-2 gap-4 lg:col-span-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Fee Value" value={formatCurrency(stats.totalFee)} icon={Wallet} accent="primary" />
            <StatCard label="Collected" value={formatCurrency(stats.revenue)} icon={CircleDollarSign} accent="accent" />
            <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} icon={TrendingDown} accent="danger" />
            <StatCard label="Enrollments" value={stats.total} icon={GraduationCap} accent="primary" />
          </>
        )}
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium text-(--color-muted-foreground)">Overall Collection</p>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-display text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{collectionPct}%</span>
          <span className="text-xs text-(--color-muted-foreground) tabular-nums">
            {formatCurrency(stats.revenue)} / {formatCurrency(stats.totalFee)}
          </span>
        </div>
        <Meter value={stats.revenue} max={stats.totalFee} tone="accent" className="mt-3" />
        <p className="mt-2 text-xs text-(--color-muted-foreground) tabular-nums">
          <span className="font-medium text-rose-600 dark:text-rose-400">{formatCurrency(stats.outstanding)}</span> still outstanding
        </p>
      </Card>
    </div>
  )
}

function EnrollmentDashboard({
  isLoading, byProgram, byFeeStatus, maxFeeCount, byYear, maxYearCount, pendingOrPartial, batchNameById, onViewAll,
}: {
  isLoading: boolean
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
                  <p className="font-display text-lg font-bold tabular-nums">{count}</p>
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
                    <Meter value={count} max={maxFeeCount} tone={feeTone(status as FeeStatus)} className="flex-1" />
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
                    <Meter value={count} max={maxYearCount} tone="accent" className="flex-1" />
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
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="min-w-56">Fee Collection</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrPartial.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name}</TableCell>
                    <TableCell>{e.program}</TableCell>
                    <TableCell>{e.batch_id ? batchNameById.get(e.batch_id) ?? '—' : '—'}</TableCell>
                    <TableCell><FeeCell enrollment={e} /></TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-rose-600 dark:text-rose-400">
                      {formatCurrency(e.pending_amount)}
                    </TableCell>
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

/** Paid / total with a fee meter — the money-centric record cell. */
function FeeCell({ enrollment: e }: { enrollment: Enrollment }) {
  return (
    <div className="min-w-48">
      <div className="flex items-baseline justify-between gap-2 text-sm tabular-nums">
        <span className="font-medium text-(--color-foreground)">{formatCurrency(e.paid_amount)}</span>
        <span className="text-xs text-(--color-muted-foreground)">of {formatCurrency(e.total_fee)}</span>
      </div>
      <Meter
        value={e.paid_amount}
        max={e.total_fee || e.paid_amount || 1}
        tone={feeTone(e.fee_status)}
        size="sm"
        className="mt-1.5"
      />
    </div>
  )
}

function EnrollmentListView({
  batchNameById, onEdit,
}: {
  batchNameById: Map<string, string>
  onEdit: (e: Enrollment) => void
}) {
  const confirm = useConfirm()
  const branchParam = useBranchQueryParam()
  const [search, setSearch] = React.useState('')
  const [feeStatusFilter, setFeeStatusFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [paymentTarget, setPaymentTarget] = React.useState<Enrollment | null>(null)
  const queryClient = useQueryClient()

  const debouncedSearch = useDebounced(search.trim(), 300)
  React.useEffect(() => setPage(1), [debouncedSearch, feeStatusFilter])

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', branchParam, 'list', page, debouncedSearch, feeStatusFilter],
    queryFn: () => {
      const qs = new URLSearchParams(branchParam)
      qs.set('page', String(page))
      qs.set('page_size', String(PAGE_SIZE))
      if (debouncedSearch) qs.set('search', debouncedSearch)
      if (feeStatusFilter) qs.set('fee_status', feeStatusFilter)
      return api.get<Page<Enrollment>>(`/enrollments?${qs.toString()}`)
    },
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  React.useEffect(() => {
    if (page * PAGE_SIZE >= total) return
    const next = page + 1
    queryClient.prefetchQuery({
      queryKey: ['enrollments', branchParam, 'list', next, debouncedSearch, feeStatusFilter],
      queryFn: () => {
        const qs = new URLSearchParams(branchParam)
        qs.set('page', String(next))
        qs.set('page_size', String(PAGE_SIZE))
        if (debouncedSearch) qs.set('search', debouncedSearch)
        if (feeStatusFilter) qs.set('fee_status', feeStatusFilter)
        return api.get<Page<Enrollment>>(`/enrollments?${qs.toString()}`)
      },
    })
  }, [page, total, debouncedSearch, feeStatusFilter, branchParam, queryClient])

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => api.post(`/enrollments/${id}/payment`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Payment recorded')
      setPaymentTarget(null)
    },
    onError: () => toast.error('Could not record payment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success('Enrollment deleted')
    },
    onError: () => toast.error('Could not delete enrollment'),
  })

  return (
    <>
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>Student Records</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search name, mobile, program…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
            <Select value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)} className="w-auto">
              <option value="">All fee statuses</option>
              {FEE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={8} />
          ) : items.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrollments found" description="Try adjusting your search or filters." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="min-w-56">Fee Collection</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="font-medium">{e.student_name}</p>
                      <p className="text-xs text-(--color-muted-foreground) tabular-nums">{e.mobile}</p>
                    </TableCell>
                    <TableCell>
                      <p>{e.program}</p>
                      {e.year_of_study && <p className="text-xs text-(--color-muted-foreground)">{e.year_of_study}</p>}
                    </TableCell>
                    <TableCell>{e.batch_id ? batchNameById.get(e.batch_id) ?? '—' : '—'}</TableCell>
                    <TableCell><FeeCell enrollment={e} /></TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-rose-600 dark:text-rose-400">
                      {e.pending_amount > 0 ? formatCurrency(e.pending_amount) : '—'}
                    </TableCell>
                    <TableCell><StatusBadge status={e.fee_status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {e.fee_status !== 'Paid' && (
                          <Button size="sm" variant="outline" onClick={() => setPaymentTarget(e)}>
                            Record Payment
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" aria-label={`Edit ${e.student_name}`} onClick={() => onEdit(e)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Delete ${e.student_name}`}
                          onClick={async () => {
                            if (await confirm({
                              title: 'Delete enrollment?',
                              description: <>“{e.student_name}” and their fee record will be permanently removed. This cannot be undone.</>,
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

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

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
    <Dialog
      open={!!enrollment}
      onClose={onClose}
      title="Record Payment"
      description={`${enrollment.student_name} — pending ${formatCurrency(enrollment.pending_amount)}`}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="payment-form" loading={loading}>Record Payment</Button>
        </>
      }
    >
      <form
        id="payment-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          const value = Number(amount)
          if (value > 0) onSubmit(value)
        }}
      >
        <div className="rounded-lg border border-(--color-border) bg-(--color-muted) p-3">
          <div className="flex items-baseline justify-between text-sm tabular-nums">
            <span className="text-(--color-muted-foreground)">Paid so far</span>
            <span className="font-medium">{formatCurrency(enrollment.paid_amount)} / {formatCurrency(enrollment.total_fee)}</span>
          </div>
          <Meter
            value={enrollment.paid_amount}
            max={enrollment.total_fee || enrollment.paid_amount || 1}
            tone={feeTone(enrollment.fee_status)}
            size="sm"
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input id="amount" required type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </form>
    </Dialog>
  )
}

/** A blank New Enrollment form — Enrollment Date defaults to today. */
const blankEnrollment = () => ({
  student_name: '', mobile: '', email: '', college: '', program: '', year_of_study: '',
  batch_id: '', start_date: '', end_date: '',
  enrollment_date: new Date().toISOString().slice(0, 10),
  total_fee: '', paid_amount: '', branch_id: '',
})

function EnrollmentDialog({ open, onClose, batches, enrollment }: { open: boolean; onClose: () => void; batches: Batch[]; enrollment?: Enrollment | null }) {
  const queryClient = useQueryClient()
  const programs = useProgramOptions(open)
  const [form, setForm] = React.useState(blankEnrollment)

  // Prefill when editing; reset when creating. Paid amount is only set at
  // creation — afterwards it's managed via Record Payment.
  React.useEffect(() => {
    if (!open) return
    setForm({
      student_name: enrollment?.student_name ?? '',
      mobile: enrollment?.mobile ?? '',
      email: enrollment?.email ?? '',
      college: enrollment?.college ?? '',
      program: enrollment?.program ?? '',
      year_of_study: enrollment?.year_of_study ?? '',
      batch_id: enrollment?.batch_id ?? '',
      start_date: enrollment?.start_date ?? '',
      end_date: enrollment?.end_date ?? '',
      // New enrollments default to today.
      enrollment_date: enrollment?.enrollment_date ?? new Date().toISOString().slice(0, 10),
      total_fee: enrollment?.total_fee != null ? String(enrollment.total_fee) : '',
      paid_amount: enrollment?.paid_amount != null ? String(enrollment.paid_amount) : '',
      branch_id: enrollment?.branch_id ?? '',
    })
  }, [open, enrollment])

  const saveMutation = useMutation({
    mutationFn: () => {
      const base = {
        student_name: form.student_name,
        mobile: form.mobile,
        email: form.email.trim() || null,
        college: form.college.trim() || null,
        program: form.program,
        year_of_study: form.year_of_study || null,
        batch_id: form.batch_id || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        enrollment_date: form.enrollment_date || null,
        total_fee: Number(form.total_fee) || 0,
        branch_id: form.branch_id || undefined,
      }
      return enrollment
        ? api.patch(`/enrollments/${enrollment.id}`, base)
        : api.post('/enrollments', { ...base, paid_amount: Number(form.paid_amount) || 0 })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] })
      toast.success(enrollment ? 'Enrollment updated' : 'Enrollment created')
      onClose()
    },
    onError: () => toast.error(enrollment ? 'Could not update enrollment' : 'Could not create enrollment'),
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={enrollment ? 'Edit Enrollment' : 'New Enrollment'}
      description={enrollment ? 'Update the enrollment details.' : 'Enroll a new student.'}
      className="max-w-3xl"
      footer={
        <>
          {!enrollment && (
            <Button type="button" variant="ghost" onClick={() => setForm(blankEnrollment())}>Clear</Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="enrollment-form" loading={saveMutation.isPending}>
            {enrollment ? 'Save changes' : 'Create Enrollment'}
          </Button>
        </>
      }
    >
      <form
        id="enrollment-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          saveMutation.mutate()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="student_name">Student Name *</Label>
            <Input id="student_name" required value={form.student_name} onChange={(e) => setForm({ ...form, student_name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile *</Label>
            <MobileInput id="mobile" required minLength={10} value={form.mobile} onValueChange={(v) => setForm({ ...form, mobile: v })} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="college">College / Institution</Label>
            <Input id="college" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="College name" />
          </div>
          <div>
            <Label htmlFor="program">Program *</Label>
            <Select id="program" required value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })}>
              <option value="">Select program</option>
              {programs.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="year">Year of Study</Label>
            <Select id="year" value={form.year_of_study} onChange={(e) => setForm({ ...form, year_of_study: e.target.value })}>
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="batch">Batch</Label>
            <Select id="batch" value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
              <option value="">Unassigned</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="enrollment_date">Enrollment Date</Label>
            <Input id="enrollment_date" type="date" value={form.enrollment_date} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="start_date">Start Date</Label>
            <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input id="end_date" type="date" min={form.start_date || undefined} value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
        </div>
        {enrollment ? (
          <div>
            <Label htmlFor="total_fee">Total Fee</Label>
            <Input id="total_fee" type="number" min={0} step="0.01" value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} />
            <p className="mt-1 text-xs text-(--color-muted-foreground)">Paid amount is managed via <span className="font-medium">Record Payment</span>.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="total_fee">Total Fee</Label>
              <Input id="total_fee" type="number" min={0} step="0.01" value={form.total_fee} onChange={(e) => setForm({ ...form, total_fee: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="paid_amount">Paid Amount</Label>
              <Input id="paid_amount" type="number" min={0} step="0.01" value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} />
            </div>
          </div>
        )}

        {!enrollment && <BranchField value={form.branch_id} onChange={(v) => setForm({ ...form, branch_id: v })} />}
      </form>
    </Dialog>
  )
}
