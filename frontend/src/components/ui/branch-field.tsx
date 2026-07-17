import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { Label, Select } from './input'
import type { Branch } from '@/lib/types'

/**
 * Branch picker for "create" forms.
 *
 * A super admin isn't tied to a branch, so new records must say which branch
 * they belong to — without this the API rejects the create with
 * "branch_id is required". Branch users (admin/trainer) never see it: the API
 * scopes their records to their own branch automatically.
 *
 * Defaults to the branch selected in the top bar, else the first branch.
 */
export function BranchField({
  id = 'branch_id',
  value,
  onChange,
  hint,
}: {
  id?: string
  value: string
  onChange: (branchId: string) => void
  /** Shown under the picker — e.g. what moving an existing record will drag along. */
  hint?: React.ReactNode
}) {
  const { profile, viewingBranchId } = useAuth()
  const isSuperAdmin = profile?.role === 'super_admin'

  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => api.get<Branch[]>('/branches'),
    enabled: isSuperAdmin,
  })

  // Preselect a sensible branch so the common case needs no thought.
  React.useEffect(() => {
    if (!isSuperAdmin || value) return
    const fallback = viewingBranchId || branches?.[0]?.id
    if (fallback) onChange(fallback)
  }, [isSuperAdmin, value, viewingBranchId, branches, onChange])

  if (!isSuperAdmin) return null

  return (
    <div>
      <Label htmlFor={id}>Branch *</Label>
      <Select id={id} required value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select branch</option>
        {(branches ?? []).map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </Select>
      {hint && <p className="mt-1.5 text-xs text-(--color-muted-foreground)">{hint}</p>}
    </div>
  )
}
