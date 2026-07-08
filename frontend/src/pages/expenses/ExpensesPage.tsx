import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, Wallet, Receipt, CheckCircle2, Clock } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Meter } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { Dialog } from '@/components/ui/dialog'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Expense, ExpenseStatus } from '@/lib/types'

const STATUSES: ExpenseStatus[] = ['Pending', 'Approved']

function useExpenses() {
  const branchParam = useBranchQueryParam()
  return useQuery({
    queryKey: ['expenses', branchParam],
    queryFn: () => api.get<Expense[]>(`/expenses${branchParam ? `?${branchParam}` : ''}`),
  })
}

export default function ExpensesPage() {
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: expenses, isLoading } = useExpenses()

  const stats = React.useMemo(() => {
    const list = expenses ?? []
    return {
      total: list.reduce((sum, e) => sum + e.amount, 0),
      approvedTotal: list.filter((e) => e.status === 'Approved').reduce((sum, e) => sum + e.amount, 0),
      pendingTotal: list.filter((e) => e.status === 'Pending').reduce((sum, e) => sum + e.amount, 0),
      records: list.length,
    }
  }, [expenses])

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses ?? []) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [expenses])

  const recent = (expenses ?? []).slice(0, 5)

  async function handleExport() {
    try {
      await downloadExport('/expenses/export', 'expenses.xlsx')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        subtitle="Expense ledger & approvals"
        icon={Wallet}
        actions={
          <>
            <div className="flex rounded-lg border border-(--color-border) p-1">
              {(['dashboard', 'list'] as const).map((v) => (
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
                  {v === 'dashboard' ? 'Overview' : 'Ledger'}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New Expense
            </Button>
          </>
        }
      />

      {view === 'dashboard' ? (
        <ExpensesDashboard
          isLoading={isLoading}
          stats={stats}
          byCategory={byCategory}
          recent={recent}
          onViewAll={() => setView('list')}
        />
      ) : (
        <ExpensesListView expenses={expenses ?? []} isLoading={isLoading} />
      )}

      <NewExpenseDialog open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}

function MoneySummary({
  isLoading,
  stats,
}: {
  isLoading: boolean
  stats: { total: number; approvedTotal: number; pendingTotal: number; records: number }
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
      ) : (
        <>
          <StatCard label="Total Spend" value={formatCurrency(stats.total)} icon={Wallet} accent="primary" />
          <StatCard label="Approved" value={formatCurrency(stats.approvedTotal)} icon={CheckCircle2} accent="accent" />
          <StatCard label="Pending" value={formatCurrency(stats.pendingTotal)} icon={Clock} accent="warning" />
          <StatCard label="Records" value={stats.records} icon={Receipt} accent="accent" />
        </>
      )}
    </div>
  )
}

function CategoryBreakdown({ byCategory, total }: { byCategory: [string, number][]; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {byCategory.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
        ) : (
          <div className="space-y-3.5">
            {byCategory.map(([category, amount]) => {
              const share = total > 0 ? (amount / total) * 100 : 0
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-(--color-foreground)">
                      {category}
                      <span className="text-xs tabular-nums text-(--color-muted-foreground)">
                        {share.toFixed(0)}%
                      </span>
                    </span>
                    <span className="font-display text-sm font-semibold tabular-nums text-(--color-foreground)">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <Meter value={amount} max={total} tone="primary" size="sm" />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExpensesDashboard({
  isLoading,
  stats,
  byCategory,
  recent,
  onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; approvedTotal: number; pendingTotal: number; records: number }
  byCategory: [string, number][]
  recent: Expense[]
  onViewAll: () => void
}) {
  return (
    <div className="space-y-6">
      <MoneySummary isLoading={isLoading} stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <CategoryBreakdown byCategory={byCategory} total={stats.total} />

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Recent Ledger</CardTitle>
            <button
              onClick={onViewAll}
              className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline"
            >
              View All
            </button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : recent.length === 0 ? (
              <EmptyState icon={Wallet} title="No expenses yet." description="Expenses you record will show up here." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="tabular-nums text-(--color-muted-foreground)">{formatDate(e.date)}</TableCell>
                      <TableCell className="font-medium">{e.title}</TableCell>
                      <TableCell>
                        <Badge>{e.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>
                        <StatusBadge status={e.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ExpensesListView({ expenses, isLoading }: { expenses: Expense[]; isLoading: boolean }) {
  const [search, setSearch] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const queryClient = useQueryClient()

  const categories = React.useMemo(() => {
    const set = new Set<string>()
    for (const e of expenses) set.add(e.category)
    return Array.from(set)
  }, [expenses])

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/expenses/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense approved')
    },
    onError: () => toast.error('Could not approve expense'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense deleted')
    },
    onError: () => toast.error('Could not delete expense'),
  })

  const filtered = expenses.filter((e) => {
    if (categoryFilter && e.category !== categoryFilter) return false
    if (statusFilter && e.status !== statusFilter) return false
    if (search && !`${e.title} ${e.vendor ?? ''} ${e.category}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const filteredTotal = filtered.reduce((sum, e) => sum + e.amount, 0)

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>Ledger</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search title, vendor, category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Wallet} title="No expenses found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums text-(--color-muted-foreground)">{formatDate(e.date)}</TableCell>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>
                    <Badge>{e.category}</Badge>
                  </TableCell>
                  <TableCell className="text-(--color-muted-foreground)">{e.vendor ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(e.amount)}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {e.status === 'Pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={approveMutation.isPending}
                          onClick={() => approveMutation.mutate(e.id)}
                        >
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(e.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="border-t border-(--color-border) bg-(--color-muted)/40">
              <tr>
                <td colSpan={4} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground)">
                  {filtered.length} record{filtered.length === 1 ? '' : 's'}
                </td>
                <td className="px-4 py-3 text-right font-display text-sm font-bold tabular-nums text-(--color-foreground)">
                  {formatCurrency(filteredTotal)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function NewExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState({
    title: '', category: '', amount: '', vendor: '', date: '', notes: '',
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/expenses', {
        title: form.title,
        category: form.category,
        amount: Number(form.amount),
        vendor: form.vendor || null,
        date: form.date || null,
        notes: form.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      toast.success('Expense created')
      setForm({ title: '', category: '', amount: '', vendor: '', date: '', notes: '' })
      onClose()
    },
    onError: () => toast.error('Could not create expense'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New Expense" description="Record a new branch expense.">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Input id="category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Rent" />
          </div>
          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" required type="number" min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create Expense</Button>
        </div>
      </form>
    </Dialog>
  )
}
