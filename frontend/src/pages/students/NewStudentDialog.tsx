import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { RefreshCw, Copy } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { MobileInput } from '@/components/ui/mobile-input'
import { Dialog } from '@/components/ui/dialog'
import { randomPassword } from '@/lib/password'
import { copyToClipboard } from '@/lib/utils'
import type { Branch, Domain } from '@/lib/types'

const EMPTY = {
  full_name: '', email: '', username: '', mobile: '', password: '',
  branch_id: '', domain_id: '', account_expiry: '',
}

export function NewStudentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = React.useState(EMPTY)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  // Domains depend on the chosen branch.
  const { data: domains } = useQuery({
    queryKey: ['domains', form.branch_id],
    queryFn: () => api.get<Domain[]>(`/domains?branch_id=${form.branch_id}`),
    enabled: open && !!form.branch_id,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post('/students', {
        full_name: form.full_name,
        email: form.email,
        username: form.username,
        password: form.password,
        mobile: form.mobile || null,
        branch_id: form.branch_id,
        domain_id: form.domain_id,
        // Expiry is inclusive of the selected day: valid through 23:59:59.
        account_expiry: form.account_expiry ? `${form.account_expiry}T23:59:59` : null,
      }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      const creds = `Username: ${form.username}\nEmail: ${form.email}\nPassword: ${form.password}`
      // Copy straight away — the password can't be retrieved later.
      const copied = await copyToClipboard(creds)
      toast.success('Student created', {
        description: copied
          ? 'Credentials copied to your clipboard — paste them to share.'
          : 'Copy the credentials now — the password cannot be retrieved later.',
        action: copied ? undefined : { label: 'Copy credentials', onClick: () => copyToClipboard(creds) },
        duration: 12000,
      })
      setForm(EMPTY)
      onClose()
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not create student')
    },
  })

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.branch_id) return toast.error('Select a branch')
    if (!form.domain_id) return toast.error('Select an internship domain')
    createMutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Student"
      description="Create a student login and assign their internship domain."
      footer={
        <>
          <Button type="button" variant="ghost" onClick={() => setForm(EMPTY)}>Clear</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="student-form" loading={createMutation.isPending}>Create Student</Button>
        </>
      }
    >
      <form id="student-form" className="space-y-4" onSubmit={submit}>
        <div>
          <Label htmlFor="s_name">Full Name *</Label>
          <Input id="s_name" required value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s_email">Email *</Label>
            <Input id="s_email" required type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="s_username">Username *</Label>
            <Input id="s_username" required value={form.username} placeholder="ai_student01"
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-(--color-muted-foreground)">
          The student can sign in with either their email or username.
        </p>

        <div>
          <Label htmlFor="s_password">Password *</Label>
          <div className="flex gap-2">
            <Input id="s_password" required minLength={8} value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <Button type="button" variant="outline" size="icon" title="Generate password"
              onClick={() => setForm({ ...form, password: randomPassword() })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" title="Copy password"
              onClick={() => { copyToClipboard(form.password); toast.success('Password copied') }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s_branch">Branch *</Label>
            <Select id="s_branch" value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value, domain_id: '' })}>
              <option value="">Select branch</option>
              {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="s_domain">Internship Domain *</Label>
            <Select id="s_domain" value={form.domain_id} disabled={!form.branch_id}
              onChange={(e) => setForm({ ...form, domain_id: e.target.value })}>
              <option value="">{form.branch_id ? 'Select domain' : 'Select branch first'}</option>
              {(domains ?? []).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="s_mobile">Mobile</Label>
            <MobileInput id="s_mobile" value={form.mobile} onValueChange={(v) => setForm({ ...form, mobile: v })} />
          </div>
          <div>
            <Label htmlFor="s_expiry">Account Expiry</Label>
            <Input id="s_expiry" type="date" value={form.account_expiry}
              onChange={(e) => setForm({ ...form, account_expiry: e.target.value })} />
          </div>
        </div>
        <p className="-mt-2 text-xs text-(--color-muted-foreground)">
          Leave expiry blank for an account that never expires. After the date, the student can no longer sign in.
        </p>

      </form>
    </Dialog>
  )
}
