import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, GraduationCap } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { MODULE_META, TRAINER_MODULES, type Branch, type ManagedUser, type ModuleKey } from '@/lib/types'

const ASSIGNABLE_MODULES: ModuleKey[] = (Object.keys(MODULE_META) as ModuleKey[]).filter(
  (k) => k !== 'dashboard' && k !== 'my_account',
)
const TRAINER_ASSIGNABLE = TRAINER_MODULES.filter((m) => ASSIGNABLE_MODULES.includes(m))

type EditableRole = 'branch_admin' | 'trainer'

/**
 * Edit an existing Admin/Trainer. Super admins can change everything including
 * the login email, role and branch; branch admins may only adjust the details
 * and module access of users in their own branch (the API enforces this too).
 */
export function EditUserDialog({ user, onClose }: { user: ManagedUser | null; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { profile } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'
  const open = !!user

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open && isSuperAdmin,
  })

  const [form, setForm] = React.useState({ full_name: '', email: '', mobile: '', branch_id: '' })
  const [role, setRole] = React.useState<EditableRole>('branch_admin')
  const [modules, setModules] = React.useState<ModuleKey[]>([])

  // Load the selected user's current values each time the dialog opens.
  React.useEffect(() => {
    if (!user) return
    setForm({
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile ?? '',
      branch_id: user.branch_id ?? '',
    })
    setRole(user.role === 'trainer' ? 'trainer' : 'branch_admin')
    setModules(user.modules.filter((m): m is ModuleKey => ASSIGNABLE_MODULES.includes(m as ModuleKey)))
  }, [user])

  function selectRole(r: EditableRole) {
    setRole(r)
    // Switching to Trainer applies the trainer preset; switching back leaves
    // the current selection so an admin's access isn't silently wiped.
    if (r === 'trainer') setModules([...TRAINER_ASSIGNABLE])
  }

  function toggleModule(m: ModuleKey) {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }
  const allSelected = ASSIGNABLE_MODULES.every((m) => modules.includes(m))

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        full_name: form.full_name.trim(),
        mobile: form.mobile || null,
        modules,
      }
      // Only a super admin may move these — sending them otherwise would 403.
      if (isSuperAdmin) {
        body.email = form.email.trim()
        body.role = role
        body.branch_id = form.branch_id || null
      }
      return api.patch(`/users/${user!.id}`, body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      onClose()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update user'),
  })

  if (!user) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit — ${user.full_name}`}
      description="Update details, role, branch and module access."
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="edit-user-form" loading={save.isPending}>Save changes</Button>
        </>
      }
    >
      <form
        id="edit-user-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (isSuperAdmin && !form.branch_id) {
            toast.error('Branch is required')
            return
          }
          save.mutate()
        }}
      >
        {/* Role — super admin only */}
        {isSuperAdmin && (
          <div>
            <Label>Account type</Label>
            <div className="grid grid-cols-2 gap-1 rounded-lg border border-(--color-border) bg-(--color-muted) p-1">
              {([
                { key: 'branch_admin', label: 'Admin', icon: ShieldCheck },
                { key: 'trainer', label: 'Trainer', icon: GraduationCap },
              ] as const).map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => selectRole(r.key)}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    role === r.key
                      ? 'bg-(--color-card) text-(--color-foreground) shadow-sm'
                      : 'text-(--color-muted-foreground) hover:text-(--color-foreground)',
                  )}
                >
                  <r.icon className="h-4 w-4" /> {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="e_full_name">Full Name *</Label>
            <Input id="e_full_name" required value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="e_email">Email *</Label>
            <Input id="e_email" required type="email" value={form.email} disabled={!isSuperAdmin}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="e_mobile">Mobile</Label>
            <MobileInput id="e_mobile" value={form.mobile} onValueChange={(v) => setForm({ ...form, mobile: v })} />
          </div>
        </div>
        {isSuperAdmin && (
          <p className="-mt-2 text-xs text-(--color-muted-foreground)">
            Changing the email changes the address this user signs in with.
          </p>
        )}

        {isSuperAdmin && (
          <div>
            <Label htmlFor="e_branch">Branch *</Label>
            <Select id="e_branch" value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">Select branch</option>
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Module Access</Label>
            <button
              type="button"
              onClick={() => setModules(allSelected ? [] : [...ASSIGNABLE_MODULES])}
              className="cursor-pointer text-xs font-medium text-(--color-primary) hover:underline"
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-lg border border-(--color-border) p-3 sm:grid-cols-3">
            {ASSIGNABLE_MODULES.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={modules.includes(m)}
                  onChange={() => toggleModule(m)}
                  className="h-4 w-4 rounded border-(--color-input)"
                />
                {MODULE_META[m].label}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Dialog>
  )
}
