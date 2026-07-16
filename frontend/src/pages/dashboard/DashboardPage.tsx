import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MessagesSquare, GraduationCap, CalendarRange, ListChecks, BookOpen,
  Wallet, UserCircle, X, LayoutDashboard, TrendingUp, PieChart as PieChartIcon,
  BarChart3, type LucideIcon,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StatCardSkeleton, Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MODULE_META, type ModuleKey, type Domain } from '@/lib/types'

interface DashboardSummary {
  module_counts: Record<string, number | null>
  summary: {
    total_enquiries: number
    converted_count: number
    students_enrolled: number
    revenue: number
    total_expenses: number
    expense_records: number
  }
  programs: Record<string, number>
}

const MODULE_CARDS: { key: ModuleKey; icon: LucideIcon; accent: 'primary' | 'accent' | 'warning' | 'danger' }[] = [
  { key: 'enquiry', icon: MessagesSquare, accent: 'primary' },
  { key: 'enrollment', icon: GraduationCap, accent: 'accent' },
  { key: 'batch_management', icon: CalendarRange, accent: 'primary' },
  { key: 'batch_execution', icon: ListChecks, accent: 'warning' },
  { key: 'curriculum', icon: BookOpen, accent: 'primary' },
  { key: 'expense', icon: Wallet, accent: 'danger' },
  { key: 'my_account', icon: UserCircle, accent: 'primary' },
]

const CHART_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
]

const TOOLTIP_STYLE: React.CSSProperties = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  color: 'var(--color-foreground)',
  fontSize: 12,
}

const AXIS_TICK = { fill: 'var(--color-muted-foreground)', fontSize: 12 }

export default function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const branchParam = useBranchQueryParam()
  const [year, setYear] = React.useState('')
  const [month, setMonth] = React.useState('')
  const [program, setProgram] = React.useState('')

  const filterParams = new URLSearchParams()
  if (branchParam) {
    const [, v] = branchParam.split('=')
    filterParams.set('branch_id', v)
  }
  if (year) filterParams.set('year', year)
  if (month) filterParams.set('month', month)
  if (program) filterParams.set('program', program)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', filterParams.toString()],
    queryFn: () => api.get<DashboardSummary>(`/dashboard/summary?${filterParams.toString()}`),
  })

  // All internship domains — so the program filter lists every program, not just
  // ones that already have enquiries.
  const { data: domains } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => api.get<Domain[]>('/domains'),
  })

  const isSuperAdmin = profile?.role === 'super_admin'
  const visibleCards = MODULE_CARDS.filter(
    (c) => isSuperAdmin || c.key === 'my_account' || profile?.modules.includes(c.key),
  )

  // Dropdown lists every domain label (deduped across branches) plus any program
  // already present in the data, sorted alphabetically.
  const programOptions = React.useMemo(() => {
    const labels = new Set<string>((domains ?? []).map((d) => d.label))
    Object.keys(data?.programs ?? {}).forEach((p) => labels.add(p))
    return [...labels].sort((a, b) => a.localeCompare(b))
  }, [domains, data])
  const hasFilters = year || month || program

  const programData = Object.entries(data?.programs ?? {})
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)

  const moduleData = Object.entries(data?.module_counts ?? {})
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, value]) => ({
      name: MODULE_META[key as ModuleKey]?.label ?? key,
      value: value as number,
    }))

  const firstName = profile?.full_name?.split(' ')[0]

  const filterControls = (
    <>
      <Select value={year} onChange={(e) => setYear(e.target.value)} className="w-auto">
        <option value="">Filter by Year</option>
        {[2023, 2024, 2025, 2026].map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </Select>
      <Select value={month} onChange={(e) => setMonth(e.target.value)} className="w-auto">
        <option value="">Filter by Month</option>
        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </Select>
      <Select value={program} onChange={(e) => setProgram(e.target.value)} className="w-auto">
        <option value="">Filter by Program</option>
        {programOptions.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer"
          aria-label="Clear filters"
          onClick={() => { setYear(''); setMonth(''); setProgram('') }}
        >
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={firstName ? `Welcome back, ${firstName}` : undefined}
        icon={LayoutDashboard}
        actions={filterControls}
      />

      {/* Hero KPI row */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label="Total Enquiries"
                value={data?.summary?.total_enquiries ?? 0}
                hint={`${data?.summary?.converted_count ?? 0} converted`}
                icon={MessagesSquare}
                accent="primary"
              />
              <StatCard
                label="Converted Enquiries"
                value={data?.summary?.converted_count ?? 0}
                hint="from total enquiries"
                icon={TrendingUp}
                accent="accent"
              />
              <StatCard
                label="Students Enrolled"
                value={data?.summary?.students_enrolled ?? 0}
                hint="active learners"
                icon={GraduationCap}
                accent="accent"
              />
              <StatCard
                label="Revenue"
                value={formatCurrency(data?.summary?.revenue ?? 0)}
                hint="collected to date"
                icon={Wallet}
                accent="primary"
              />
              <StatCard
                label="Total Expenses"
                value={formatCurrency(data?.summary?.total_expenses ?? 0)}
                hint={`${data?.summary?.expense_records ?? 0} records`}
                icon={Wallet}
                accent="danger"
              />
              <StatCard
                label="Expense Records"
                value={data?.summary?.expense_records ?? 0}
                hint="logged transactions"
                icon={ListChecks}
                accent="warning"
              />
            </>
          )}
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-(--color-primary)" />
              Program Distribution
            </CardTitle>
            <CardDescription>Enrollment share across programs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : programData.length === 0 ? (
              <EmptyState
                icon={PieChartIcon}
                title="No program data"
                description="Program enrollment will appear here once available."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={programData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={100}
                    paddingAngle={2}
                    stroke="var(--color-card)"
                  >
                    {programData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {!isLoading && programData.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {programData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-(--color-muted-foreground)">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-(--color-foreground)">{d.name}</span>
                    <span className="tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-(--color-primary)" />
              Records by Module
            </CardTitle>
            <CardDescription>Volume of records across active modules</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : moduleData.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No module data"
                description="Record counts will appear here once modules have data."
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={moduleData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={54} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--color-muted)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {moduleData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick links */}
      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold text-(--color-foreground)">Quick Access</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {isLoading
            ? Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
            : visibleCards.map(({ key, icon: Icon, accent }) => {
                const meta = MODULE_META[key]
                const count = data?.module_counts?.[key]
                const ACCENT: Record<string, string> = {
                  primary: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
                  accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
                  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
                  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
                }
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => navigate(meta.path)}
                    aria-label={`Go to ${meta.label}`}
                    className="flex cursor-pointer flex-col items-start gap-2 rounded-(--radius-card) border border-(--color-border) bg-(--color-card) p-3 text-left shadow-(--shadow-card) transition-shadow duration-200 hover:shadow-(--shadow-card-hover) active:scale-[0.99]"
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ACCENT[accent]}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-xs font-medium text-(--color-foreground)">{meta.label}</span>
                    <span className="text-xs text-(--color-muted-foreground) tabular-nums">
                      {count !== null && count !== undefined ? `${count} records` : 'Ask a question'}
                    </span>
                  </button>
                )
              })}
        </div>
      </section>
    </div>
  )
}
