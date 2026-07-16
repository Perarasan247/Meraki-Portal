import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck, GraduationCap, Plus, RefreshCw, Copy } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { randomPassword } from '@/lib/password'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'
import { Dialog } from '@/components/ui/dialog'
import { cn, copyToClipboard } from '@/lib/utils'
import { MODULE_META, TRAINER_MODULES, type Branch, type ModuleKey } from '@/lib/types'

const ASSIGNABLE_MODULES: ModuleKey[] = (Object.keys(MODULE_META) as ModuleKey[]).filter((k) => k !== 'dashboard' && k !== 'my_account')
const TRAINER_ASSIGNABLE = TRAINER_MODULES.filter((m) => ASSIGNABLE_MODULES.includes(m))

type CreatableRole = 'branch_admin' | 'trainer'
const EMPTY = { full_name: '', email: '', mobile: '', password: '', branch_id: '' }

// The super admin creates two kinds of staff accounts here: branch Admins (full,
// configurable access) and Trainers (a limited, preset module set). Students are
// created via the Students module.
export function NewUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  const [role, setRole] = React.useState<CreatableRole>('branch_admin')
  const [form, setForm] = React.useState(EMPTY)
  const [modules, setModules] = React.useState<ModuleKey[]>([])
  const [addingBranch, setAddingBranch] = React.useState(false)
  const [newBranchName, setNewBranchName] = React.useState('')

  // Everything back to create-defaults — used on open and by the Clear button.
  const resetAll = React.useCallback(() => {
    setRole('branch_admin')
    setForm(EMPTY)
    setModules([])
    setAddingBranch(false)
    setNewBranchName('')
  }, [])

  React.useEffect(() => {
    if (!open) return
    resetAll()
  }, [open, resetAll])

  function selectRole(r: CreatableRole) {
    setRole(r)
    // Trainers get a sensible preset; admins choose their own.
    setModules(r === 'trainer' ? [...TRAINER_ASSIGNABLE] : [])
  }

  function toggleModule(m: ModuleKey) {
    setModules((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const allSelected = ASSIGNABLE_MODULES.every((m) => modules.includes(m))
  function toggleAll() {
    setModules(allSelected ? [] : [...ASSIGNABLE_MODULES])
  }

  const createBranch = useMutation({
    mutationFn: (name: string) => api.post<Branch>('/branches', { name }),
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      setForm((f) => ({ ...f, branch_id: b.id }))
      setAddingBranch(false)
      setNewBranchName('')
      toast.success('Branch added')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add branch'),
  })
  function addBranch() {
    const name = newBranchName.trim()
    if (name) createBranch.mutate(name)
  }

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/users', {
        full_name: form.full_name,
        email: form.email,
        mobile: form.mobile || null,
        password: form.password,
        role,
        branch_id: form.branch_id || null,
        modules,
        permission_level: 'custom',
      }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      const label = role === 'trainer' ? 'Trainer' : 'Admin'
      const creds = `Email: ${form.email}\nPassword: ${form.password}`
      // Copy the credentials straight away — the password can't be retrieved later.
      const copied = await copyToClipboard(creds)
      toast.success(`${label} created`, {
        description: copied
          ? 'Login details copied to your clipboard — paste them to share.'
          : 'Copy the login details now; the password cannot be retrieved later.',
        action: copied ? undefined : { label: 'Copy', onClick: () => copyToClipboard(creds) },
        duration: 12000,
      })
      onClose()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not create account'),
  })

  const roleLabel = role === 'trainer' ? 'Trainer' : 'Admin'

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New User"
      description="Create a branch Admin or Trainer account."
      className="max-w-2xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={resetAll}>Clear</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="user-form" loading={createMutation.isPending}>Create {roleLabel}</Button>
        </>
      }
    >
      <form
        id="user-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!form.branch_id) {
            toast.error('Branch is required')
            return
          }
          createMutation.mutate()
        }}
      >
        {/* Role selector */}
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
                  role === r.key ? 'bg-(--color-card) text-(--color-foreground) shadow-sm' : 'text-(--color-muted-foreground) hover:text-(--color-foreground)',
                )}
              >
                <r.icon className="h-4 w-4" /> {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input id="email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <MobileInput id="mobile" value={form.mobile} onValueChange={(v) => setForm({ ...form, mobile: v })} />
          </div>
        </div>

        <div>
          <Label htmlFor="password">Password *</Label>
          <div className="flex gap-2">
            {/* Visible on purpose: the admin is setting someone else's password
                and has to pass it on, so it must be readable/copyable. */}
            <Input id="password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button type="button" variant="outline" size="icon" title="Generate password"
              onClick={() => setForm({ ...form, password: randomPassword() })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Copy password"
              disabled={!form.password}
              onClick={() => { copyToClipboard(form.password); toast.success('Password copied') }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Branch + inline "add branch" */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label htmlFor="branch_id" className="mb-0">Branch *</Label>
            {!addingBranch && (
              <button
                type="button"
                onClick={() => setAddingBranch(true)}
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-(--color-primary) hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> New branch
              </button>
            )}
          </div>
          {addingBranch ? (
            <div className="flex items-end gap-2">
              <Input
                autoFocus
                value={newBranchName}
                placeholder="e.g. Salem"
                onChange={(e) => setNewBranchName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBranch() } }}
              />
              <Button type="button" loading={createBranch.isPending} onClick={addBranch}>Add</Button>
              <Button type="button" variant="ghost" onClick={() => { setAddingBranch(false); setNewBranchName('') }}>Cancel</Button>
            </div>
          ) : (
            <Select id="branch_id" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
              <option value="">Select branch</option>
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          )}
        </div>

        {/* Module access + select all */}
        <div>
          <div className="flex items-center justify-between">
            <Label className="mb-0">Module Access</Label>
            <button
              type="button"
              onClick={toggleAll}
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
