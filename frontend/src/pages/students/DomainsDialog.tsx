import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { useConfirm } from '@/components/ui/confirm'
import type { Branch, Domain } from '@/lib/types'

/** Super-admin management of the per-branch internship domain list. */
export function DomainsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const [branchId, setBranchId] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [addToAll, setAddToAll] = React.useState(false)

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: open,
  })

  React.useEffect(() => {
    if (open && !branchId && branches?.length) setBranchId(branches[0].id)
  }, [open, branches, branchId])

  // Load every branch's domains so we can show branch membership per domain.
  const { data: domains } = useQuery({
    queryKey: ['domains', 'all'],
    queryFn: () => api.get<Domain[]>('/domains'),
    enabled: open,
  })

  // Group by key so a domain added to multiple branches shows as one row with
  // a chip per branch it belongs to.
  const groups = React.useMemo(() => {
    const byKey = new Map<string, { key: string; label: string; branchIds: string[]; ids: string[] }>()
    for (const d of domains ?? []) {
      const g = byKey.get(d.key) ?? { key: d.key, label: d.label, branchIds: [], ids: [] }
      g.ids.push(d.id)
      if (d.branch_id && !g.branchIds.includes(d.branch_id)) g.branchIds.push(d.branch_id)
      byKey.set(d.key, g)
    }
    return [...byKey.values()]
  }, [domains])

  const createMutation = useMutation({
    mutationFn: async () => {
      const key = label.trim().toLowerCase().replace(/\s+/g, '-')
      const targets = addToAll ? (branches ?? []).map((b) => b.id) : [branchId]
      // One domain row per branch (key is derived from the label if omitted).
      await Promise.all(
        targets.map((bid) => api.post('/domains', { branch_id: bid, key, label: label.trim() })),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      setLabel('')
      toast.success(addToAll ? 'Domain added to all branches' : 'Domain added')
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Could not add domain'),
  })

  const deleteMutation = useMutation({
    // A domain may span several branches (one row each) — remove them all.
    mutationFn: (ids: string[]) => Promise.all(ids.map((id) => api.delete(`/domains/${id}`))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] })
      toast.success('Domain removed')
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Could not remove domain'),
  })

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Internship Domains"
      description="Tracks students are assigned to. Content is gated by these."
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="d_branch">Branch</Label>
          <Select id="d_branch" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            {(branches ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </Select>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); if (label.trim()) createMutation.mutate() }}
        >
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="d_label">New domain</Label>
              <Input id="d_label" value={label} placeholder="e.g. Data Science Internship"
                onChange={(e) => setLabel(e.target.value)} />
            </div>
            <Button type="submit" loading={createMutation.isPending}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-(--color-muted-foreground)">
            <input
              type="checkbox"
              checked={addToAll}
              onChange={(e) => setAddToAll(e.target.checked)}
              className="h-4 w-4 rounded border-(--color-input)"
            />
            Add to all branches
            {(branches?.length ?? 0) > 0 && (
              <span className="text-(--color-foreground)">
                ({(branches ?? []).map((b) => b.name).join(', ')})
              </span>
            )}
          </label>
        </form>

        <div className="space-y-2">
          {groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-(--color-muted-foreground)">
              No domains yet.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.key}
                className="flex items-center justify-between gap-2 rounded-lg border border-(--color-border) px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{g.label}</span>
                  {/* Chip per branch — both show when the domain is in both. */}
                  {(branches ?? [])
                    .filter((b) => g.branchIds.includes(b.id))
                    .map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center rounded-full bg-(--color-sidebar-active) px-2 py-0.5 text-xs font-medium text-(--color-primary)"
                      >
                        {b.name}
                      </span>
                    ))}
                </div>
                <button
                  onClick={async () => {
                    if (await confirm({
                      title: `Remove “${g.label}”?`,
                      description: g.branchIds.length > 1
                        ? `This removes the domain from all ${g.branchIds.length} branches.`
                        : 'This removes the internship domain.',
                      confirmLabel: 'Remove',
                      tone: 'danger',
                    })) deleteMutation.mutate(g.ids)
                  }}
                  className="shrink-0 cursor-pointer rounded-md p-1.5 text-(--color-muted-foreground) hover:bg-(--color-muted) hover:text-(--color-destructive)"
                  title="Remove domain"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  )
}
