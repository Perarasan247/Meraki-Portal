import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import type { Domain, StudentAccount } from '@/lib/types'

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function EditStudentDialog({
  student,
  onClose,
}: {
  student: StudentAccount | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const open = !!student
  const [domainId, setDomainId] = React.useState('')
  const [expiry, setExpiry] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')

  React.useEffect(() => {
    if (student) {
      setDomainId(student.domain_id ?? '')
      setExpiry(toDateInput(student.account_expiry))
      setNewPassword('')
    }
  }, [student])

  const { data: domains } = useQuery({
    queryKey: ['domains', student?.branch_id],
    queryFn: () => api.get<Domain[]>(`/domains?branch_id=${student!.branch_id}`),
    enabled: open && !!student?.branch_id,
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/students/${student!.id}`, {
        domain_id: domainId || null,
        account_expiry: expiry ? `${expiry}T23:59:59` : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student updated')
      onClose()
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not update'),
  })

  const reactivateMutation = useMutation({
    mutationFn: () => api.patch(`/students/${student!.id}`, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      toast.success('Student reactivated')
      onClose()
    },
    onError: () => toast.error('Could not reactivate'),
  })

  const resetMutation = useMutation({
    mutationFn: () => api.post(`/students/${student!.id}/reset-password`, { password: newPassword }),
    onSuccess: () => {
      const creds = newPassword
      toast.success('Password reset', {
        description: 'Share the new password with the student.',
        action: { label: 'Copy', onClick: () => navigator.clipboard?.writeText(creds) },
        duration: 10000,
      })
      setNewPassword('')
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not reset password'),
  })

  if (!student) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit — ${student.full_name}`}
      description={student.email}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          {!student.is_active && (
            <Button variant="accent" type="button" loading={reactivateMutation.isPending}
              onClick={() => reactivateMutation.mutate()}>
              Reactivate
            </Button>
          )}
          <Button type="button" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="e_domain">Internship Domain</Label>
            <Select id="e_domain" value={domainId} onChange={(e) => setDomainId(e.target.value)}>
              <option value="">Unassigned</option>
              {(domains ?? []).map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="e_expiry">Account Expiry</Label>
            <Input id="e_expiry" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
        </div>

        <div className="border-t border-(--color-border) pt-4">
          <Label htmlFor="e_reset">Reset password</Label>
          <div className="flex gap-2">
            <Input id="e_reset" value={newPassword} placeholder="New password (min 8 chars)"
              onChange={(e) => setNewPassword(e.target.value)} />
            <Button type="button" variant="outline" disabled={newPassword.length < 8}
              loading={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
              Reset
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-(--color-muted-foreground)">
            Use this when a student is locked out. They can also reset it themselves via “Forgot password”.
          </p>
        </div>
      </div>
    </Dialog>
  )
}
