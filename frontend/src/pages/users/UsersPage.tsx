import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Users, ShieldCheck, UserCog, Sliders } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton, StatCardSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
import { MODULE_META, type ManagedUser, type ModuleKey, type UserRole } from '@/lib/types'
import { NewUserDialog } from '@/pages/users/NewUserDialog'

const ROLES: UserRole[] = ['super_admin', 'branch_admin', 'staff', 'custom']
const COVERAGE_MODULES = (Object.keys(MODULE_META) as ModuleKey[]).filter((k) => k !== 'dashboard' && k !== 'my_account')

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ManagedUser[]>('/users'),
  })
}

export default function UsersPage() {
  const { profile } = useAuth()
  const [view, setView] = React.useState<'dashboard' | 'list'>('dashboard')
  const [formOpen, setFormOpen] = React.useState(false)
  const { data: users, isLoading } = useUsers()
  const isSuperAdmin = profile?.role === 'super_admin'

  const { data: coverage } = useQuery({
    queryKey: ['module-access-coverage'],
    queryFn: () => api.get<Record<string, number>>('/users/module-access-coverage'),
    enabled: isSuperAdmin,
  })

  const stats = React.useMemo(() => {
    const list = users ?? []
    return {
      total: list.length,
      superAdmins: list.filter((u) => u.role === 'super_admin').length,
      staff: list.filter((u) => u.role === 'staff').length,
      custom: list.filter((u) => u.role === 'custom').length,
    }
  }, [users])

  const byRole = React.useMemo(() => {
    const list = users ?? []
    return ROLES.map((r) => [r, list.filter((u) => u.role === r).length] as const)
  }, [users])

  const recent = (users ?? []).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">User Management</h1>
          <p className="mt-1 text-sm text-(--color-muted-foreground)">Manage accounts, roles, and module access.</p>
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
          {isSuperAdmin && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New User
            </Button>
          )}
        </div>
      </div>

      {view === 'dashboard' ? (
        <UsersDashboard
          isLoading={isLoading}
          stats={stats}
          byRole={byRole}
          coverage={coverage}
          recent={recent}
          isSuperAdmin={isSuperAdmin}
          onViewAll={() => setView('list')}
        />
      ) : (
        <UsersListView users={users ?? []} isLoading={isLoading} isSuperAdmin={isSuperAdmin} />
      )}

      {isSuperAdmin && <NewUserDialog open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function modulesSummary(modules: string[]): string {
  if (modules.length === 0) return '—'
  const joined = modules.map((m) => MODULE_META[m as ModuleKey]?.label ?? m).join(', ')
  return joined.length > 40 ? `${joined.slice(0, 40)}…` : joined
}

function UsersDashboard({
  isLoading, stats, byRole, coverage, recent, isSuperAdmin, onViewAll,
}: {
  isLoading: boolean
  stats: { total: number; superAdmins: number; staff: number; custom: number }
  byRole: (readonly [UserRole, number])[]
  coverage: Record<string, number> | undefined
  recent: ManagedUser[]
  isSuperAdmin: boolean
  onViewAll: () => void
}) {
  const maxCoverage = Math.max(1, ...COVERAGE_MODULES.map((m) => coverage?.[m] ?? 0))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard label="Total Users" value={stats.total} icon={Users} accent="primary" />
            <StatCard label="Super Admins" value={stats.superAdmins} icon={ShieldCheck} accent="accent" />
            <StatCard label="Staff" value={stats.staff} icon={UserCog} accent="warning" />
            <StatCard label="Custom Role" value={stats.custom} icon={Sliders} accent="danger" />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {byRole.map(([role, count]) => (
                <div key={role} className="rounded-lg border border-(--color-border) p-3">
                  <p className="text-xs capitalize text-(--color-muted-foreground)">{role.replace('_', ' ')}</p>
                  <p className="font-display text-lg font-bold">{count}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Module Access Coverage</CardTitle></CardHeader>
          <CardContent>
            {!isSuperAdmin ? (
              <p className="text-sm text-(--color-muted-foreground)">Only visible to super admins.</p>
            ) : (
              <div className="space-y-3">
                {COVERAGE_MODULES.map((m) => {
                  const count = coverage?.[m] ?? 0
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-sm text-(--color-muted-foreground)">{MODULE_META[m].label}</span>
                      <div className="h-2.5 flex-1 rounded-full bg-(--color-muted)">
                        <div
                          className="h-2.5 rounded-full bg-(--color-primary) transition-all"
                          style={{ width: `${(count / maxCoverage) * 100}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-sm font-medium tabular-nums">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>All Users</CardTitle>
          <button onClick={onViewAll} className="cursor-pointer text-sm font-medium text-(--color-primary) hover:underline">
            View All
          </button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton />
          ) : recent.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" description="Users you create will show up here." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell className="capitalize">{u.role.replace('_', ' ')}</TableCell>
                    <TableCell>{modulesSummary(u.modules)}</TableCell>
                    <TableCell className="capitalize">{u.permission_level}</TableCell>
                    <TableCell>{u.last_login ? formatDate(u.last_login) : 'Never'}</TableCell>
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

function UsersListView({ users, isLoading, isSuperAdmin }: { users: ManagedUser[]; isLoading: boolean; isSuperAdmin: boolean }) {
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('')
  const queryClient = useQueryClient()

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
    },
    onError: () => toast.error('Could not deactivate user'),
  })

  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (search && !`${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle>All Users</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search name, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto">
            <option value="">All roles</option>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton rows={8} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                {isSuperAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell className="capitalize">{u.role.replace('_', ' ')}</TableCell>
                  <TableCell>{modulesSummary(u.modules)}</TableCell>
                  <TableCell>{u.last_login ? formatDate(u.last_login) : 'Never'}</TableCell>
                  <TableCell>{u.is_active ? 'Active' : 'Inactive'}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      {u.is_active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={deactivateMutation.isPending}
                          onClick={() => deactivateMutation.mutate(u.id)}
                        >
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
