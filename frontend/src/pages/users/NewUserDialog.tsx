import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { MODULE_META, type Branch, type ModuleKey, type UserRole } from '@/lib/types'

const ROLES: UserRole[] = ['super_admin', 'branch_admin', 'staff', 'custom']
const ASSIGNABLE_MODULES = (Object.keys(MODULE_META) as ModuleKey[]).filter((k) => k !== 'dashboard' && k !== 'my_account')

export function NewUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  const [form, setForm] = React.useState({
    full_name: '', email: '', mobile: '', password: '', role: 'staff' as UserRole, branch_id: '',
  })
  const [modules, setModules] = React.useState<ModuleKey[]>([])

  function toggleModule(m: ModuleKey) {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/users', {
        full_name: form.full_name,
        email: form.email,
        mobile: form.mobile || null,
        password: form.password,
        role: form.role,
        branch_id: form.role === 'super_admin' ? null : form.branch_id || null,
        modules,
        permission_level: 'custom',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created')
      setForm({ full_name: '', email: '', mobile: '', password: '', role: 'staff', branch_id: '' })
      setModules([])
      onClose()
    },
    onError: () => toast.error('Could not create user'),
  })

  return (
    <Dialog open={open} onClose={onClose} title="New User" description="Invite a team member and set their access.">
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (form.role !== 'super_admin' && !form.branch_id) {
            toast.error('Branch is required for this role')
            return
          }
          createMutation.mutate()
        }}
      >
        <div>
          <Label htmlFor="full_name">Full Name *</Label>
          <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input id="mobile" type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="password">Password *</Label>
          <Input id="password" required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="branch_id">Branch {form.role !== 'super_admin' && '*'}</Label>
            <Select
              id="branch_id"
              value={form.branch_id}
              disabled={form.role === 'super_admin'}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
            >
              <option value="">Select branch</option>
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        </div>
        <div>
          <Label>Module Access</Label>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-(--color-border) p-3 sm:grid-cols-3">
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={createMutation.isPending}>Create User</Button>
        </div>
      </form>
    </Dialog>
  )
}
