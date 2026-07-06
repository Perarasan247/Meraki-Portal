import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Plus, Wallet, CalendarDays, FileText, CheckCircle2 } from 'lucide-react'
import { api, downloadExport } from '@/lib/api'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StatusBadge } from '@/components/ui/badge'
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
    const now = new Date()
    const thisMonth = list.filter((e) => {
      const d = new Date(e.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    return {
      total: list.reduce((sum, e) => sum + e.amount, 0),
      thisMonth: thisMonth.reduce((sum, e) => sum + e.amount, 0),
      records: list.length,
      approved: list.filter((e) => e.status === 'Approved').length,
    }
  }, [expenses])

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses ?? []) map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    return Array.from(map.entries())
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Expense Management</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Track and approve branch spending.</p>
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
            <Plus className="h-4 w-4" /> New Expense
          </Button>
        </div>
      </div>

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

function ExpensesDashboard({
  isLoading, stats, byCategory, recent, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; thisMonth: number; records: number; approved: number }
  byCategory: [string, number][]
  recent: Expense[]
  onViewAll: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Expenses" value={formatCurrency(stats.total)} icon={Wallet} accent="primary" />
            <StatCard label="This Month" value={formatCurrency(stats.thisMonth)} icon={CalendarDays} accent="warning" />
            <StatCard label="Total Records" value={stats.records} icon={FileText} accent="accent" />
            <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="accent" />
          </>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
        <CardContent>
          {byCategory.length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No data yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {byCategory.map(([category, amount]) => (
                <div key={category} className="rounded-lg border border-(--color-border) p-3">
                  <p className="text-xs text-(--color-muted-foreground)">{category}</p>
                  <p className="font-display text-lg font-bold">{formatCurrency(amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent Expenses</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
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
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell>{formatCurrency(e.amount)}</TableCell>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell>{e.vendor ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
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

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Expenses</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search title, vendor, category…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <EmptyState icon={Wallet} title="No expenses found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.title}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>{formatCurrency(e.amount)}</TableCell>
                  <TableCell>{e.vendor ?? '—'}</TableCell>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell><StatusBadge status={e.status} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
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
