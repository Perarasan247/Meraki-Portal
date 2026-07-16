import * as React from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, GraduationCap, Layers, UserCheck, Settings2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useDebounced } from '@/hooks/useDebounced'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { TableSkeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { cn, formatDate } from '@/lib/utils'
import type { StudentAccount, Page } from '@/lib/types'

const PAGE_SIZE = 25
import { NewStudentDialog } from './NewStudentDialog'
import { EditStudentDialog } from './EditStudentDialog'
import { DomainsDialog } from './DomainsDialog'

type Status = { label: string; variant: 'success' | 'danger' | 'default' }

function accountStatus(s: StudentAccount): Status {
  if (!s.is_active) return { label: 'Inactive', variant: 'default' }
  if (s.account_expiry && new Date(s.account_expiry) < new Date())
    return { label: 'Expired', variant: 'danger' }
  return { label: 'Active', variant: 'success' }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function StudentsPage() {
  const confirm = useConfirm()
  const { role } = useAuth()
  const isSuperAdmin = role === 'super_admin'
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState('')
  const [page, setPage] = React.useState(1)
  const [newOpen, setNewOpen] = React.useState(false)
  const [domainsOpen, setDomainsOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<StudentAccount | null>(null)

  const debouncedSearch = useDebounced(search.trim(), 300)
  // A new search resets to the first page.
  React.useEffect(() => setPage(1), [debouncedSearch])

  const { data, isLoading } = useQuery({
    queryKey: ['students', page, debouncedSearch],
    queryFn: () => {
      const p = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (debouncedSearch) p.set('search', debouncedSearch)
      return api.get<Page<StudentAccount>>(`/students?${p.toString()}`)
    },
    placeholderData: keepPreviousData, // keep the current page visible while the next loads
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student deactivated')
    },
    onError: () => toast.error('Could not deactivate student'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/students/${id}?hard=true`),
    onSuccess: () => toast.success('Student deleted'),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not delete student'),
    // Refetch either way: on failure the row may still be gone server-side, and
    // showing records that no longer exist is worse than an extra request.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['students'] }),
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const active = items.filter((s) => accountStatus(s).label === 'Active').length
  const domains = new Set(items.map((s) => s.domain_label).filter(Boolean)).size

  // Prefetch the next page so paging forward is instant.
  React.useEffect(() => {
    if (page * PAGE_SIZE >= total) return
    const next = page + 1
    queryClient.prefetchQuery({
      queryKey: ['students', next, debouncedSearch],
      queryFn: () => {
        const p = new URLSearchParams({ page: String(next), page_size: String(PAGE_SIZE) })
        if (debouncedSearch) p.set('search', debouncedSearch)
        return api.get<Page<StudentAccount>>(`/students?${p.toString()}`)
      },
    })
  }, [page, total, debouncedSearch, queryClient])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        subtitle="Student logins & internship domains"
        icon={GraduationCap}
        actions={
          <>
            <Input placeholder="Search name, email, domain…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
            {isSuperAdmin && (
              <>
                <Button variant="outline" onClick={() => setDomainsOpen(true)}>
                  <Settings2 className="h-4 w-4" /> Domains
                </Button>
                <Button onClick={() => setNewOpen(true)}>
                  <Plus className="h-4 w-4" /> New Student
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SummaryChip icon={GraduationCap} label="students" value={total} />
        <SummaryChip icon={UserCheck} label="active (page)" value={active} tone="success" />
        <SummaryChip icon={Layers} label="domains (page)" value={domains} tone="primary" />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} /></div>
          ) : items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={GraduationCap} title={debouncedSearch ? 'No matching students' : 'No students yet'}
                description={debouncedSearch ? 'Try a different search.' : isSuperAdmin ? 'Create a student login to get started.' : 'No students in your branch.'}
                actionLabel={isSuperAdmin && !debouncedSearch ? 'New Student' : undefined}
                onAction={isSuperAdmin && !debouncedSearch ? () => setNewOpen(true) : undefined} />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expiry</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => {
                  const status = accountStatus(s)
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) text-xs font-semibold text-(--color-primary)">
                            {initials(s.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-(--color-foreground)">{s.full_name}</p>
                            <p className="truncate text-xs text-(--color-muted-foreground)">{s.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-(--color-muted-foreground)">{s.username ?? '—'}</TableCell>
                      <TableCell>
                        {s.domain_label ? <Badge variant="primary">{s.domain_label}</Badge>
                          : <span className="text-sm text-(--color-muted-foreground)">—</span>}
                      </TableCell>
                      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                      <TableCell className="tabular-nums text-(--color-muted-foreground)">
                        {s.account_expiry ? formatDate(s.account_expiry) : 'Never'}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                            {s.is_active && (
                              <Button size="sm" variant="ghost" className="text-(--color-destructive)"
                                loading={deactivate.isPending && deactivate.variables === s.id}
                                onClick={() => deactivate.mutate(s.id)}>
                                Deactivate
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
                              loading={remove.isPending && remove.variables === s.id}
                              onClick={async () => {
                                if (await confirm({
                                  title: `Delete ${s.full_name}?`,
                                  description: 'This permanently removes their login and all course progress. This cannot be undone.',
                                  confirmLabel: 'Delete student',
                                  tone: 'danger',
                                })) remove.mutate(s.id)
                              }}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />

      {isSuperAdmin && (
        <>
          <NewStudentDialog open={newOpen} onClose={() => setNewOpen(false)} />
          <DomainsDialog open={domainsOpen} onClose={() => setDomainsOpen(false)} />
          <EditStudentDialog student={editing} onClose={() => setEditing(null)} />
        </>
      )}
    </div>
  )
}

function SummaryChip({
  icon: Icon, label, value, tone = 'default',
}: {
  icon: typeof GraduationCap
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
