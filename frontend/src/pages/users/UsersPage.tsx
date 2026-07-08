import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Users, ShieldCheck, CircleDot } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
import { MODULE_META, type ManagedUser, type ModuleKey, type UserRole } from '@/lib/types'
import { NewUserDialog } from '@/pages/users/NewUserDialog'

const ROLES: UserRole[] = ['super_admin', 'branch_admin', 'staff', 'custom']

const ROLE_VARIANT: Record<UserRole, 'primary' | 'info' | 'default' | 'warning'> = {
  super_admin: 'primary',
  branch_admin: 'info',
  staff: 'default',
  custom: 'warning',
}

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<ManagedUser[]>('/users'),
  })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function roleLabel(role: string): string {
  return role.replace('_', ' ')
}

export default function UsersPage() {
  const { profile } = useAuth()
  const [formOpen, setFormOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('')
  const { data: users, isLoading } = useUsers()
  const queryClient = useQueryClient()
  const isSuperAdmin = profile?.role === 'super_admin'

  // Preserved: module-access coverage query (super-admin only).
  useQuery({
    queryKey: ['module-access-coverage'],
    queryFn: () => api.get<Record<string, number>>('/users/module-access-coverage'),
    enabled: isSuperAdmin,
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
    },
    onError: () => toast.error('Could not deactivate user'),
  })

  const list = users ?? []

  const summary = React.useMemo(() => {
    return {
      total: list.length,
      active: list.filter((u) => u.is_active).length,
      admins: list.filter((u) => u.role === 'super_admin' || u.role === 'branch_admin').length,
    }
  }, [list])

  const filtered = list.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (search && !`${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Team members, roles & access"
        icon={Users}
        actions={
          <>
            <Input
              placeholder="Search name, email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52"
            />
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto">
              <option value="">All roles</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </Select>
            {isSuperAdmin && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" /> New User
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SummaryChip icon={Users} label="users" value={summary.total} />
        <SummaryChip icon={CircleDot} label="active" value={summary.active} tone="success" />
        <SummaryChip icon={ShieldCheck} label="admins" value={summary.admins} tone="primary" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={8} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filters." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Module Access</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) text-xs font-semibold text-(--color-primary)">
                          {initials(u.full_name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-(--color-foreground)">{u.full_name}</p>
                          <p className="truncate text-xs text-(--color-muted-foreground)">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[u.role]} className="capitalize">
                        {roleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ModuleAccess modules={u.modules} />
                    </TableCell>
                    <TableCell>
                      {u.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-(--color-muted-foreground)">
                      {u.last_login ? formatDate(u.last_login) : 'Never'}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
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

      {isSuperAdmin && <NewUserDialog open={formOpen} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function SummaryChip({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: typeof Users
  label: string
  value: number
  tone?: 'default' | 'success' | 'primary'
}) {
  const toneClass = {
    default: 'text-(--color-muted-foreground)',
    success: 'text-emerald-600 dark:text-emerald-400',
    primary: 'text-indigo-600 dark:text-indigo-400',
  }[tone]
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-card) px-3 py-1.5 text-sm">
      <Icon className={cn('h-4 w-4', toneClass)} />
      <span className="font-display font-semibold tabular-nums">{value}</span>
      <span className="text-(--color-muted-foreground)">{label}</span>
    </div>
  )
}

function ModuleAccess({ modules }: { modules: ModuleKey[] }) {
  if (modules.length === 0) {
    return <span className="text-sm text-(--color-muted-foreground)">—</span>
  }
  const shown = modules.slice(0, 2)
  const extra = modules.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {shown.map((m) => (
        <Badge key={m} variant="default">
          {MODULE_META[m]?.label ?? m}
        </Badge>
      ))}
      {extra > 0 && <Badge variant="info">+{extra}</Badge>}
    </div>
  )
}
