import * as React from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Users, ShieldCheck, CircleDot, Pencil, Trash2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useDebounced } from '@/hooks/useDebounced'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm'
import { Input, Select } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  SortableHead, type SortState,
} from '@/components/ui/table'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { cn, formatDate } from '@/lib/utils'
import { MODULE_META, type ManagedUser, type ModuleKey, type UserRole, type Page } from '@/lib/types'
import { NewUserDialog } from '@/pages/users/NewUserDialog'
import { EditUserDialog } from '@/pages/users/EditUserDialog'
import { ViewUserDialog } from '@/pages/users/ViewUserDialog'

const ROLES: UserRole[] = ['super_admin', 'branch_admin', 'trainer', 'staff', 'custom']
const DEFAULT_PAGE_SIZE = 5

const ROLE_VARIANT: Record<UserRole, 'primary' | 'info' | 'default' | 'warning'> = {
  super_admin: 'primary',
  branch_admin: 'info',
  trainer: 'warning',
  staff: 'default',
  custom: 'default',
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
  const [editing, setEditing] = React.useState<ManagedUser | null>(null)
  // Unpaginated — the chips count every user, not just the page on screen.
  const { data: users } = useUsers()
  const isSuperAdmin = profile?.role === 'super_admin'

  // Preserved: module-access coverage query (super-admin only).
  useQuery({
    queryKey: ['module-access-coverage'],
    queryFn: () => api.get<Record<string, number>>('/users/module-access-coverage'),
    enabled: isSuperAdmin,
  })

  const summary = React.useMemo(() => {
    const list = users ?? []
    return {
      total: list.length,
      active: list.filter((u) => u.is_active).length,
      admins: list.filter((u) => u.role === 'super_admin' || u.role === 'branch_admin').length,
    }
  }, [users])

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Team members, roles & access"
        icon={Users}
        actions={
          isSuperAdmin && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" /> New User
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SummaryChip icon={Users} label="users" value={summary.total} />
        <SummaryChip icon={CircleDot} label="active" value={summary.active} tone="success" />
        <SummaryChip icon={ShieldCheck} label="admins" value={summary.admins} tone="primary" />
      </div>

      <UsersListView isSuperAdmin={!!isSuperAdmin} onEdit={setEditing} />

      {isSuperAdmin && (
        <>
          <NewUserDialog open={formOpen} onClose={() => setFormOpen(false)} />
          <EditUserDialog user={editing} onClose={() => setEditing(null)} />
        </>
      )}
    </div>
  )
}

/**
 * Table view: search, sort and paginate on the server, so it stays correct as
 * the team grows rather than filtering whatever happened to load.
 */
function UsersListView({ isSuperAdmin, onEdit }: { isSuperAdmin: boolean; onEdit: (u: ManagedUser) => void }) {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [sort, setSort] = React.useState<SortState>({ by: 'registered_at', dir: 'desc' })
  const [viewing, setViewing] = React.useState<ManagedUser | null>(null)
  const debouncedSearch = useDebounced(search.trim(), 300)
  const hasFilters = !!(search || roleFilter || statusFilter)
  // Any change to what's being listed sends you back to page 1.
  React.useEffect(() => setPage(1), [debouncedSearch, roleFilter, statusFilter, pageSize, sort])

  // One builder for both the query and the prefetch, so they can't drift apart.
  const listKey = React.useCallback(
    (p: number) => ['users', 'list', p, pageSize, debouncedSearch, roleFilter, statusFilter, sort.by, sort.dir],
    [pageSize, debouncedSearch, roleFilter, statusFilter, sort],
  )
  const fetchPage = React.useCallback(
    (p: number) => {
      const qs = new URLSearchParams()
      qs.set('page', String(p))
      qs.set('page_size', String(pageSize))
      qs.set('sort_by', sort.by)
      qs.set('sort_dir', sort.dir)
      if (debouncedSearch) qs.set('search', debouncedSearch)
      if (roleFilter) qs.set('role_filter', roleFilter)
      if (statusFilter) qs.set('status_filter', statusFilter)
      return api.get<Page<ManagedUser>>(`/users?${qs.toString()}`)
    },
    [pageSize, sort, debouncedSearch, roleFilter, statusFilter],
  )

  const { data, isLoading } = useQuery({
    queryKey: listKey(page),
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  })
  const items = data?.items ?? []
  const total = data?.total ?? 0

  React.useEffect(() => {
    if (page * pageSize >= total) return
    queryClient.prefetchQuery({ queryKey: listKey(page + 1), queryFn: () => fetchPage(page + 1) })
  }, [page, pageSize, total, queryClient, listKey, fetchPage])

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated')
    },
    onError: () => toast.error('Could not deactivate user'),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}`, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User reactivated')
    },
    onError: () => toast.error('Could not reactivate user'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}?hard=true`),
    onSuccess: () => toast.success('User deleted'),
    onError: () => toast.error('Could not delete user'),
    // Refetch either way so the table can never show records that are gone.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return (
    <>
      <Card>
        {/* Title and toolbar stack, so both sit flush with the table's left edge. */}
        <CardHeader className="gap-3">
          <CardTitle>All Users</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search name, email, mobile…" value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-56 flex-1" />
            <Select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All roles</option>
              {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </Select>
            <Select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto max-w-44">
              <option value="">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter('') }}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : items.length === 0 ? (
            <EmptyState icon={Users} title="No users found" description="Try adjusting your search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableHead label="User" column="full_name" sort={sort} onSort={setSort} />
                    <SortableHead label="Role" column="role" sort={sort} onSort={setSort} />
                    <TableHead>Module Access</TableHead>
                    <SortableHead label="Status" column="is_active" sort={sort} onSort={setSort} />
                    {/* Last login comes from Supabase Auth, not a column we can
                        order by — see _SORTABLE in the users route. */}
                    <TableHead>Last login</TableHead>
                    {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u) => (
                    <TableRow key={u.id} onClick={() => setViewing(u)} className="cursor-pointer">
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
                        {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="tabular-nums text-(--color-muted-foreground)">
                        {u.last_login ? formatDate(u.last_login) : 'Never'}
                      </TableCell>
                      {isSuperAdmin && (
                        /* Actions must not trigger the row's View. */
                        <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                          {u.role === 'super_admin' ? null : (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" title="Edit" aria-label={`Edit ${u.full_name}`} onClick={() => onEdit(u)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {u.is_active ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  loading={deactivateMutation.isPending}
                                  onClick={() => deactivateMutation.mutate(u.id)}
                                >
                                  Deactivate
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    loading={reactivateMutation.isPending}
                                    onClick={() => reactivateMutation.mutate(u.id)}
                                  >
                                    Reactivate
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    title="Delete"
                                    aria-label={`Delete ${u.full_name}`}
                                    className="text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
                                    loading={deleteMutation.isPending}
                                    onClick={async () => {
                                      if (await confirm({
                                        title: `Delete ${u.full_name}?`,
                                        description: 'This permanently removes their login and account. This cannot be undone.',
                                        confirmLabel: 'Delete user',
                                        tone: 'danger',
                                      })) deleteMutation.mutate(u.id)
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} onPageSizeChange={setPageSize} />
        </CardContent>
      </Card>

      <ViewUserDialog
        user={viewing}
        canEdit={isSuperAdmin && viewing?.role !== 'super_admin'}
        onClose={() => setViewing(null)}
        onEdit={(u) => { setViewing(null); onEdit(u) }}
      />
    </>
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
    primary: 'text-emerald-600 dark:text-emerald-400',
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
