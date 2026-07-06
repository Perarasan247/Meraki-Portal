import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  MessagesSquare, GraduationCap, CalendarRange, ListChecks, BookOpen,
  Wallet, Sparkles, UserCircle, Megaphone, X, type LucideIcon,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useBranchQueryParam } from '@/hooks/useModuleAccess'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { StatCardSkeleton } from '@/components/ui/skeleton'
import { Select } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { MODULE_META, type ModuleKey } from '@/lib/types'

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
  marketing: Record<string, number>
  programs: Record<string, number>
}

const MODULE_CARDS: { key: ModuleKey; icon: LucideIcon; accent: 'primary' | 'accent' | 'warning' | 'danger' }[] = [
  { key: 'enquiry', icon: MessagesSquare, accent: 'primary' },
  { key: 'enrollment', icon: GraduationCap, accent: 'accent' },
  { key: 'batch_management', icon: CalendarRange, accent: 'primary' },
  { key: 'batch_execution', icon: ListChecks, accent: 'warning' },
  { key: 'curriculum', icon: BookOpen, accent: 'primary' },
  { key: 'expense', icon: Wallet, accent: 'danger' },
  { key: 'marketing', icon: Megaphone, accent: 'accent' },
  { key: 'reports', icon: Sparkles, accent: 'primary' },
  { key: 'my_account', icon: UserCircle, accent: 'primary' },
]

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

  const isSuperAdmin = profile?.role === 'super_admin'
  const visibleCards = MODULE_CARDS.filter(
    (c) => isSuperAdmin || c.key === 'my_account' || profile?.modules.includes(c.key),
  )

  const programOptions = Object.keys(data?.programs ?? {})
  const hasFilters = year || month || program

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-(--color-muted-foreground)">
          Here's what's happening across {isSuperAdmin ? 'your branches' : 'your branch'} today.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Modules</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
            : visibleCards.map(({ key, icon, accent }) => {
                const meta = MODULE_META[key]
                const count = data?.module_counts[key]
                return (
                  <StatCard
                    key={key}
                    label={meta.label}
                    value={count ?? '—'}
                    hint={count !== null && count !== undefined ? `${count} records` : 'Ask a question'}
                    icon={icon}
                    accent={accent}
                    onClick={() => navigate(meta.path)}
                  />
                )
              })}
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Summary View</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                onClick={() => { setYear(''); setMonth(''); setProgram('') }}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Total Enquiries"
            value={data?.summary.total_enquiries ?? 0}
            hint={`${data?.summary.converted_count ?? 0} converted`}
            icon={MessagesSquare}
            accent="primary"
          />
          <StatCard
            label="Students Enrolled"
            value={data?.summary.students_enrolled ?? 0}
            hint={formatCurrency(data?.summary.revenue ?? 0) + ' revenue'}
            icon={GraduationCap}
            accent="accent"
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(data?.summary.total_expenses ?? 0)}
            hint={`${data?.summary.expense_records ?? 0} records`}
            icon={Wallet}
            accent="danger"
          />
        </CardContent>
      </Card>
    </div>
  )
}
