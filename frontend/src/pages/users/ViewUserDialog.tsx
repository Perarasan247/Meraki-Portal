import { useQuery } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { MODULE_META, type Branch, type ManagedUser } from '@/lib/types'

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Read-only detail view, opened by clicking a row in the list. */
export function ViewUserDialog({
  user,
  canEdit,
  onClose,
  onEdit,
}: {
  user: ManagedUser | null
  /** Only a super admin may edit, and never the super admin row itself. */
  canEdit: boolean
  onClose: () => void
  onEdit: (u: ManagedUser) => void
}) {
  const open = !!user

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  if (!user) return null

  const u = user
  const branchName = branches?.find((b) => b.id === u.branch_id)?.name
  const roleName = u.role === 'super_admin' ? 'Super Admin' : u.role === 'branch_admin' ? 'Admin' : u.role

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={u.full_name}
      description="User details"
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          {canEdit && (
            <Button type="button" onClick={() => onEdit(u)}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-muted) p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-sidebar-active) text-sm font-semibold text-(--color-primary)">
            {initials(u.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-(--color-foreground)">{u.email}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge variant="info" className="capitalize">{roleName}</Badge>
              {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="default">Inactive</Badge>}
            </p>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Mobile" value={u.mobile} mono />
          <Field label="Branch" value={u.role === 'super_admin' ? 'All branches' : branchName} />
          <Field label="Last login" value={u.last_login ? formatDate(u.last_login) : 'Never'} />
          <Field label="Registered" value={u.registered_at ? formatDate(u.registered_at) : null} />
        </dl>

        {/* The table only has room for 2 module badges + "+N" — show them all. */}
        <div>
          <h4 className="text-xs font-medium text-(--color-muted-foreground)">
            Module access ({u.role === 'super_admin' ? 'all' : u.modules.length})
          </h4>
          {u.role === 'super_admin' ? (
            <p className="mt-1.5 text-sm text-(--color-muted-foreground)">
              A super admin has access to every module in every branch.
            </p>
          ) : u.modules.length === 0 ? (
            <p className="mt-1.5 text-sm text-(--color-muted-foreground)">No modules assigned.</p>
          ) : (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {u.modules.map((m) => (
                <Badge key={m} variant="default">{MODULE_META[m]?.label ?? m}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-(--color-muted-foreground)">{label}</dt>
      <dd
        className={`mt-0.5 truncate text-sm text-(--color-foreground) ${mono ? 'tabular-nums' : ''}`}
        title={value ?? undefined}
      >
        {value?.toString().trim() ? value : <span className="text-(--color-muted-foreground)">—</span>}
      </dd>
    </div>
  )
}
