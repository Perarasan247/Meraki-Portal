import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2, Building2, AlertTriangle } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm'
import type { Branch } from '@/lib/types'

/**
 * Branch manager — create a branch and remove empty ones. Super-admin only
 * (the API enforces it too).
 *
 * A branch can also be added inline while creating a user, but only by name;
 * this is the full form, and the only place a branch can be deleted.
 */
export function BranchesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [name, setName] = React.useState('')
  const [address, setAddress] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName('')
    setAddress('')
  }, [open])

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Branch>('/branches', { name: name.trim(), address: address.trim() || null }),
    onSuccess: (b) => {
      // Every branch picker and the top-bar switcher read this key.
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success(`${b.name} added`)
      setName('')
      setAddress('')
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add branch'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      toast.success('Branch deleted')
    },
    // 409 = the branch still holds records; the message lists them.
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not delete branch'),
  })

  async function handleDelete(b: Branch) {
    const ok = await confirm({
      title: `Delete “${b.name}”?`,
      description: (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-(--color-foreground) dark:border-amber-500/40 dark:bg-amber-500/10">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            A branch can only be deleted once it’s empty. If it still has users, enquiries,
            enrollments or other records, this will be blocked and tell you what to clear first.
          </span>
        </div>
      ),
      confirmLabel: 'Delete branch',
      tone: 'danger',
    })
    if (ok) deleteMutation.mutate(b.id)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Branches"
      description="Add a branch, or remove an empty one."
      className="max-w-xl"
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" form="branch-form" loading={createMutation.isPending}>
            Add branch
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Existing branches, each removable when empty. */}
        <div>
          <h4 className="mb-2 text-xs font-medium text-(--color-muted-foreground)">
            Existing branches
          </h4>
          {isLoading ? (
            <p className="text-sm text-(--color-muted-foreground)">Loading…</p>
          ) : (branches ?? []).length === 0 ? (
            <p className="text-sm text-(--color-muted-foreground)">No branches yet.</p>
          ) : (
            <ul className="divide-y divide-(--color-border) rounded-lg border border-(--color-border)">
              {(branches ?? []).map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Building2 className="h-4 w-4 shrink-0 text-(--color-muted-foreground)" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-(--color-foreground)">{b.name}</p>
                    {b.address && (
                      <p className="truncate text-xs text-(--color-muted-foreground)">{b.address}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Delete branch"
                    aria-label={`Delete ${b.name}`}
                    className="text-(--color-destructive) hover:bg-(--color-destructive)/10 hover:text-(--color-destructive)"
                    loading={deleteMutation.isPending && deleteMutation.variables === b.id}
                    onClick={() => handleDelete(b)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Create form */}
        <form
          id="branch-form"
          className="space-y-4 border-t border-(--color-border) pt-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) createMutation.mutate()
          }}
        >
          <h4 className="text-xs font-medium text-(--color-muted-foreground)">New branch</h4>
          <div>
            <Label htmlFor="branch_name">Branch name *</Label>
            <Input
              id="branch_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Meraki Coimbatore"
            />
          </div>
          <div>
            <Label htmlFor="branch_address">Address</Label>
            <Input
              id="branch_address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Coimbatore, Tamil Nadu"
            />
          </div>
          <p className="text-xs text-(--color-muted-foreground)">
            The new branch starts empty. Add an Admin for it with New User, and its own
            programs from Curriculum.
          </p>
        </form>
      </div>
    </Dialog>
  )
}
